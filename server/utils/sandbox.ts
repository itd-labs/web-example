import { cache } from '@itd-api/cache'
import { crypt } from '@itd-api/crypto'
import { createMockServer, type MockServer } from '@itd-api/testing'
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
 * Состояние живёт **у каждого посетителя своё** и только в памяти процесса: чужих данных
 * не видно, на диск и во внешнее хранилище не попадает ничего, а через полчаса простоя
 * песочница исчезает вместе со всем, что в ней написали.
 */
interface Sandbox {
  server: MockServer
  client: ItdClient
  /** Клиенты жителей песочницы — ими она отвечает на записи посетителя. */
  locals: Map<string, ItdClient>
  /** Сколько постов было при создании: квота считается от этой отметки. */
  seedPosts: number
  usedAt: number
}

/** Через сколько простоя песочница выбрасывается. */
const IDLE_TTL = 30 * 60 * 1000

/** Сколько песочниц держим одновременно: сверх этого вытесняем самую старую. */
const MAX_SANDBOXES = 200

/** Сколько записей посетитель может создать сверх начального набора. */
const MAX_POSTS = 50

/** Предел длины текста поста или комментария. */
const MAX_TEXT = 2000

const sandboxes = new Map<string, Sandbox>()

/** Выбрасывает песочницы, к которым давно не обращались. */
function evictStale(now: number) {
  for (const [sid, sandbox] of sandboxes) {
    if (now - sandbox.usedAt > IDLE_TTL) sandboxes.delete(sid)
  }
}

/** Освобождает место под новую песочницу, выбрасывая самую давнюю. */
function evictOldest() {
  let oldestSid: string | undefined
  let oldestAt = Number.POSITIVE_INFINITY

  for (const [sid, sandbox] of sandboxes) {
    if (sandbox.usedAt < oldestAt) {
      oldestAt = sandbox.usedAt
      oldestSid = sid
    }
  }

  if (oldestSid) sandboxes.delete(oldestSid)
}

/** Заводит песочницу и клиент к ней. Плагины те же, что у живого клиента. */
function create(): Sandbox {
  const server = createMockServer({ seed: sandboxSeed() })

  const client = new ItdClient({
    ...server.clientOptions({ as: DEMO_USER }),
    logger: false,
  })

  // Порядок важен: инспектор снаружи кэша, иначе ответы из кэша минуют журнал.
  client.use(inspector())
  client.use(cache({ ttl: CACHE_TTL, maxEntries: CACHE_MAX_ENTRIES, operations: CACHED_OPERATIONS }))
  client.use(crypt({ ciphers: CRYPTO_CIPHERS }))

  return {
    server,
    client,
    locals: new Map(),
    seedPosts: server.snapshot().posts.length,
    usedAt: Date.now(),
  }
}

/** Песочница посетителя. Первое обращение её заводит, каждое следующее продлевает жизнь. */
export function sandboxFor(sid: string): Sandbox {
  const now = Date.now()
  evictStale(now)

  const existing = sandboxes.get(sid)
  if (existing) {
    existing.usedAt = now
    return existing
  }

  if (sandboxes.size >= MAX_SANDBOXES) evictOldest()

  const sandbox = create()
  sandboxes.set(sid, sandbox)
  return sandbox
}

/** Клиент SDK, ходящий в песочницу вместо итд.com. */
export function sandboxClient(sid: string): ItdClient {
  return sandboxFor(sid).client
}

/**
 * Проверяет квоты перед записью.
 *
 * Песочница живёт в оперативной памяти и открыта всем желающим, поэтому объём написанного
 * ограничен. Отказ приходит понятной ошибкой, а не падением по нехватке памяти.
 */
export function assertQuota(sid: string, text?: string | null) {
  const sandbox = sandboxFor(sid)

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

  const client = new ItdClient({
    ...sandbox.server.clientOptions({ as: username }),
    logger: false,
  })

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
export async function livenPost(sid: string, postId: string): Promise<void> {
  const sandbox = sandboxFor(sid)

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
export function unsupportedInSandbox(sid: string): string[] {
  return sandboxFor(sid).server.unsupportedRequests.map(request => `${request.method} ${request.path}`)
}
