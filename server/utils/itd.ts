import { cache } from '@itd-api/cache'
import { crypt } from '@itd-api/crypto'
import { proxyFetch } from '@itd-api/proxy'
import type { H3Event } from 'h3'
import {
  ItdAccounts,
  ItdClient,
  RuntimeMode,
  createKeyValueStore,
  createTokenStorage,
  type ItdSession,
} from 'itd-api'
import { CACHED_OPERATIONS, CACHE_MAX_ENTRIES, CACHE_TTL, CRYPTO_CIPHERS } from './plugins'

/** Откуда посетитель получает данные. */
export type ItdMode = 'live' | 'sandbox'

/** Клиент посетителя вместе с тем, чем он оказался. */
export interface ItdContext {
  itd: ItdClient
  mode: ItdMode
  sid: string
  sandbox?: Sandbox
}

/** Сколько живых клиентов держим в памяти инстанса. */
const MAX_ACCOUNTS = 200

/**
 * Контейнер клиентов — по одному на посетителя (= `sid`).
 *
 * Создаётся лениво и живёт, пока жив инстанс. Общее задаётся один раз: серверный режим,
 * кэш, расшифровка и журнал вызовов. Кэш делит хранилище по аккаунтам сам, поэтому личные
 * поля постов и профилей (`isLiked`, `isFollowing`) между посетителями не протекают.
 *
 * `rateLimitScope: 'shared'` разводит во времени запросы всех посетителей: они идут с
 * одного адреса, а лимиты итд.com считаются по IP.
 */
let accountsRef: ItdAccounts | null = null

/** Когда к аккаунту обращались последний раз — по этому и вытесняем. */
const usedAt = new Map<string, number>()

function accounts(event: H3Event): ItdAccounts {
  if (accountsRef) return accountsRef

  const config = useRuntimeConfig(event)

  accountsRef = new ItdAccounts({
    storage: sessionStore,
    // На сервере cookie ведёт встроенный jar библиотеки, а не браузер.
    mode: RuntimeMode.Server,
    timeout: 30_000,
    // Логи пишут пути и коды ответов — в проде это лишнее.
    logger: import.meta.dev,
    hooks: inspectorHooks,
    rateLimitScope: 'shared',
    // Инспектор идёт первым: зарегистрированные раньше оборачивают зарегистрированных
    // позже, а значит он видит и те вызовы, которые кэш обслужил, не дойдя до сети.
    plugins: [
      inspector(),
      cache({ ttl: CACHE_TTL, maxEntries: CACHE_MAX_ENTRIES, operations: CACHED_OPERATIONS }),
      crypt({ ciphers: CRYPTO_CIPHERS }),
    ],
    ...(config.itdBaseUrl ? { baseUrl: config.itdBaseUrl } : {}),
    ...(config.proxyUrl ? { fetch: proxyFetch(config.proxyUrl) } : {}),
  })

  return accountsRef
}

/** Выбрасывает из памяти клиента, к которому дольше всех не обращались. Токены остаются. */
function evictOldest(container: ItdAccounts) {
  let oldestSid: string | undefined
  let oldest = Number.POSITIVE_INFINITY

  for (const [sid, at] of usedAt) {
    if (at < oldest) {
      oldest = at
      oldestSid = sid
    }
  }

  if (!oldestSid) return

  usedAt.delete(oldestSid)
  void container.removeAccount(oldestSid).catch(() => {})
}

/** Клиент живого аккаунта. Заводится лениво, вытесняется по давности обращения. */
function liveClient(event: H3Event, sid: string): ItdClient {
  const container = accounts(event)

  if (!container.has(sid)) {
    if (usedAt.size >= MAX_ACCOUNTS) evictOldest(container)

    try {
      container.addAccount(sid)
    } catch {
      // Уже завели в параллельном запросе — берём готовый ниже.
    }
  }

  usedAt.set(sid, Date.now())
  return container.account(sid)
}

/**
 * Клиент текущего посетителя.
 *
 * С сохранёнными токенами это живой клиент к итд.com; без них — песочница в памяти, если
 * она включена. Роут между режимами не выбирает и различий не замечает: методы SDK одни
 * и те же.
 */
export async function useItd(event: H3Event): Promise<ItdContext> {
  const sid = await sessionId(event)
  const stored = sid ? await sessionStore.get(sid) : null

  if (sid && hasSession(stored)) {
    return { itd: liveClient(event, sid), mode: 'live', sid }
  }

  if (!useRuntimeConfig(event).public.sandbox) throw unauthorized()

  const sandboxSid = await ensureSessionId(event)
  if (!sandboxSid) throw unauthorized()

  const sandbox = await sandboxClient(sandboxSid)
  return { itd: sandbox.client, mode: 'sandbox', sid: sandboxSid, sandbox }
}

/** Клиент для роута, которому режим безразличен. */
export async function requireItd(event: H3Event): Promise<ItdClient> {
  return (await useItd(event)).itd
}

/** Выгружает клиент посетителя из памяти. Токены к этому моменту уже стёрты. */
export async function forgetAccount(sid: string): Promise<void> {
  usedAt.delete(sid)
  await accountsRef?.removeAccount(sid).catch(() => {})
}

/**
 * Проверяет, что операция вообще выполнима в текущем режиме.
 *
 * Часть маршрутов мок не реализует — например загрузку файлов. Отказ приходит понятной
 * ошибкой, а не `501` из недр библиотеки.
 */
export function assertLive(mode: ItdMode, what: string) {
  if (mode === 'sandbox') {
    throw forbidden('SANDBOX_UNSUPPORTED', `${what} доступно только со своим токеном`)
  }
}

/**
 * Одноразовый клиент для проверки токена, который посетитель только что ввёл.
 *
 * Хранилище живёт в замыкании: библиотека сама дописывает в него `deviceId` и cookie
 * продления, и после успешного вызова у нас на руках цельная сессия, которую можно
 * сохранить. Аккаунт под это заводить незачем — клиент нужен на один запрос.
 */
export function probeClient(event: H3Event, initial: ItdSession) {
  const config = useRuntimeConfig(event)
  let current: ItdSession | null = initial

  const storage = createTokenStorage(
    createKeyValueStore<ItdSession>({
      get: () => current ?? undefined,
      set: (_key, value) => {
        current = value
      },
      delete: () => {
        current = null
      },
    }),
  )

  const itd = new ItdClient({
    storage,
    mode: RuntimeMode.Server,
    timeout: 30_000,
    logger: false,
    ...(config.itdBaseUrl ? { baseUrl: config.itdBaseUrl } : {}),
    ...(config.proxyUrl ? { fetch: proxyFetch(config.proxyUrl) } : {}),
  })

  return {
    itd,
    /** Сессия в том виде, в каком её сложила библиотека. */
    session: () => current,
  }
}
