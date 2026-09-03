import { cache } from '@itd-api/cache'
import { crypt } from '@itd-api/crypto'
import {
  createMockServer,
  type MockServer,
  type MockServerSeed,
  type MockServerSnapshot,
} from '@itd-api/testing'
import { ItdClient } from 'itd-api'
import { CACHED_OPERATIONS, CACHE_MAX_ENTRIES, CACHE_TTL, CRYPTO_CIPHERS } from './plugins'
import { DEMO_USER, sandboxSeed } from '../fixtures/seed'

/**
 * Песочница посетителя без токена.
 *
 * `createMockServer()` из `@itd-api/testing` — это настоящий сервер API в памяти: он
 * принимает обычный `fetch`, ведёт состояние и потому позволяет не только смотреть, но и
 * лайкать, публиковать, подписываться.
 *
 * Состояние живёт **у каждого посетителя своё**. Сам mock-сервер работает в памяти
 * запроса, а его снимок сохраняется во внешнем Nitro storage, чтобы следующий запрос
 * восстановил те же данные даже на другом serverless-инстансе.
 */
export interface Sandbox {
  sid: string
  server: MockServer
  client: ItdClient
  /** Клиенты жителей песочницы — ими она отвечает на записи посетителя. */
  locals: Map<string, ItdClient>
  /** Сколько постов было при создании: квота считается от этой отметки. */
  seedPosts: number
  /** Сколько комментариев было при создании: квота считается от этой отметки. */
  seedComments: number
  /** Очередь сохранений не даёт более старому снимку обогнать новый в одном запросе. */
  persisting: Promise<void>
}

interface StoredSandbox {
  snapshot: MockServerSnapshot
  seedPosts: number
  seedComments: number
  updatedAt: number
}

/** Через сколько простоя сохранённая песочница удаляется. */
const IDLE_TTL_SECONDS = 30 * 60

/** Как часто продлевать TTL при одних только чтениях, чтобы не писать на каждый запрос. */
const TOUCH_INTERVAL = 5 * 60 * 1000

/** Сколько записей посетитель может создать сверх начального набора. */
const MAX_POSTS = 50

/** Сколько комментариев и ответов посетитель может создать сверх начального набора. */
const MAX_COMMENTS = 200

/** Предел длины текста поста или комментария. */
const MAX_TEXT = 2000

/** Верхняя граница одного снимка защищает Redis от неожиданного разрастания мока. */
const MAX_SNAPSHOT_BYTES = 1_000_000

const storeKey = (sid: string) => `b:${sid}`

function rawStore() {
  return useStorage<StoredSandbox>('itd-sandboxes')
}

/** Снимок содержит чуть больше полей, чем seed; серверу нужны только совместимые связи. */
function snapshotSeed(snapshot: MockServerSnapshot): MockServerSeed {
  return {
    users: snapshot.users,
    posts: snapshot.posts,
    comments: snapshot.comments,
    notifications: snapshot.notifications.map(notification => ({
      ...notification,
      actorIds: notification.actors.map(actor => actor.id),
    })),
    shopProducts: snapshot.shopProducts,
    shopOrders: snapshot.shopOrders,
  }
}

/** Сохраняет целиком согласованный снимок и заодно продлевает его TTL. */
function persist(sandbox: Sandbox): Promise<void> {
  sandbox.persisting = sandbox.persisting
    .catch(() => {})
    .then(async () => {
      const snapshot = sandbox.server.snapshot()
      const bytes = new TextEncoder().encode(JSON.stringify(snapshot)).byteLength
      if (bytes > MAX_SNAPSHOT_BYTES) {
        throw forbidden(
          'SANDBOX_STORAGE_LIMIT',
          'Песочница достигла предельного размера. Подождите полчаса, чтобы начать заново',
        )
      }

      await rawStore().setItem(
        storeKey(sandbox.sid),
        {
          snapshot,
          seedPosts: sandbox.seedPosts,
          seedComments: sandbox.seedComments,
          updatedAt: Date.now(),
        },
        { ttl: IDLE_TTL_SECONDS },
      )
    })

  return sandbox.persisting
}

function mutation(method: string | undefined): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes((method ?? 'GET').toUpperCase())
}

/** Клиент мока, который после каждой успешной мутации сохраняет новый снимок. */
function createClient(sandbox: Sandbox, username: string): ItdClient {
  const options = sandbox.server.clientOptions({ as: username })
  const mockFetch = options.fetch ?? sandbox.server.fetch

  const client = new ItdClient({
    ...options,
    fetch: async (input, init) => {
      const method = init?.method ?? (input instanceof Request ? input.method : undefined)
      const response = await mockFetch(input, init)
      if (response.ok && mutation(method)) await persist(sandbox)
      return response
    },
    logger: false,
  })

  return client
}

/** Заводит песочницу и клиент к ней. Плагины те же, что у живого клиента. */
function create(
  sid: string,
  seed: MockServerSeed,
  seedPosts?: number,
  seedComments?: number,
): Sandbox {
  const server = createMockServer({ seed })
  const initial = server.snapshot()
  const sandbox = {
    sid,
    server,
    client: undefined as unknown as ItdClient,
    locals: new Map(),
    seedPosts: seedPosts ?? initial.posts.length,
    seedComments: seedComments ?? initial.comments.length,
    persisting: Promise.resolve(),
  } satisfies Sandbox

  const client = createClient(sandbox, DEMO_USER)

  // Порядок важен: инспектор снаружи кэша, иначе ответы из кэша минуют журнал.
  client.use(inspector())
  client.use(cache({ ttl: CACHE_TTL, maxEntries: CACHE_MAX_ENTRIES, operations: CACHED_OPERATIONS }))
  client.use(crypt({ ciphers: CRYPTO_CIPHERS }))

  sandbox.client = client
  return sandbox
}

/** Каждый запрос восстанавливает свежий снимок, поэтому инстансы Vercel не расходятся. */
export async function sandboxFor(sid: string): Promise<Sandbox> {
  const stored = await rawStore().getItem(storeKey(sid))
  const sandbox = stored
    ? create(sid, snapshotSeed(stored.snapshot), stored.seedPosts, stored.seedComments)
    : create(sid, sandboxSeed())

  // Чтение тоже считается активностью, но ради экономии команд Redis TTL продлевается
  // не чаще раза в пять минут. Любая мутация сохраняется сразу в createClient().
  if (!stored || Date.now() - stored.updatedAt >= TOUCH_INTERVAL) await persist(sandbox)
  return sandbox
}

/** Клиент SDK, ходящий в песочницу вместо итд.com. */
export async function sandboxClient(sid: string): Promise<Sandbox> {
  return await sandboxFor(sid)
}

/**
 * Проверяет квоты перед записью.
 *
 * Песочница открыта всем желающим, поэтому объём написанного ограничен. Отказ приходит
 * понятной ошибкой, а не разрастанием внешнего хранилища.
 */
export function assertQuota(sandbox: Sandbox, text?: string | null) {
  if (text && text.length > MAX_TEXT) {
    throw forbidden(
      'SANDBOX_TEXT_TOO_LONG',
      `В песочнице текст ограничен ${MAX_TEXT} символами`,
    )
  }

  if (sandbox.server.snapshot().posts.length - sandbox.seedPosts >= MAX_POSTS) {
    throw forbidden(
      'SANDBOX_LIMIT_REACHED',
      `В песочнице можно создать не больше ${MAX_POSTS} записей. Перезагрузите страницу позже — она обнулится сама`,
    )
  }

  if (sandbox.server.snapshot().comments.length - sandbox.seedComments >= MAX_COMMENTS) {
    throw forbidden(
      'SANDBOX_LIMIT_REACHED',
      `В песочнице можно создать не больше ${MAX_COMMENTS} комментариев и ответов. Подождите полчаса, чтобы начать заново`,
    )
  }
}

/** Кто из жителей может отреагировать на запись посетителя. */
const LOCALS = ['boris', 'vera', 'grisha', 'nika', 'timur', 'lada']

/** Чем они комментируют — тем же, чем комментируют в любой ленте. */
const REPLIES = [
  'Первый!',
  'Ура',
  'Огонь',
  'Наконец-то',
  'Плюсую',
  'Ждали',
  'Красота',
]

/** Случайный элемент списка. */
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T
}

/** Клиент жителя. Заводится один раз на песочницу и живёт вместе с ней. */
function localClient(sandbox: Sandbox, username: string): ItdClient {
  const existing = sandbox.locals.get(username)
  if (existing) return existing

  const client = createClient(sandbox, username)

  sandbox.locals.set(username, client)
  return client
}

/**
 * Оживляет свежую запись посетителя.
 *
 * В песочнице он один, и пост, на который никто не ответил, выглядит уныло. Поэтому
 * пара жителей ставит реакцию, а один пишет короткий комментарий — обычными методами
 * SDK, от своего имени, через тот же сервер в памяти.
 *
 * Ошибки здесь неважны: не получилось оживить — пост просто останется без ответа.
 */
export async function livenPost(sandbox: Sandbox, postId: string): Promise<void> {
  const shuffled = [...LOCALS].sort(() => Math.random() - 0.5)
  const visitors = shuffled.slice(0, 2 + Math.floor(Math.random() * 2))

  // Комментарий пишет только один из них — тот же, кто поставил реакцию.
  const commenter = pick(visitors)

  for (const username of visitors) {
    const client = localClient(sandbox, username)

    try {
      await client.posts.like(postId)
      if (username === commenter) await client.posts.comment(postId, { content: pick(REPLIES) })
    } catch {
      // Мок мог не знать маршрута — тогда пост просто останется без ответа.
    }
  }
}

/** Операции, которых у мока нет вовсе: интерфейс отключает их заранее. */
export function unsupportedInSandbox(sandbox: Sandbox): string[] {
  return sandbox.server.unsupportedRequests.map(request => `${request.method} ${request.path}`)
}
