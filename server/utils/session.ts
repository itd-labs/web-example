import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import { createError, useSession } from 'h3'
import type { ItdSession, MultiTokenStorage } from 'itd-api'

/**
 * Что лежит в cookie посетителя.
 *
 * Только идентификатор записи: токены не покидают сервер. Подделанная cookie выдала бы
 * себя за чужую сессию, поэтому содержимое запечатано паролем.
 */
interface WebSession {
  sid?: string
}

/** Запись серверного хранилища: сессия SDK и когда её трогали последний раз. */
interface StoredSession {
  itd: ItdSession
  updatedAt: number
}

/** Сколько живёт запись после последнего обращения. */
const SESSION_TTL = 24 * 60 * 60 * 1000

/** Пароль из репозитория. Годится только для разработки — он известен всем. */
const INSECURE_PASSWORD = 'dev-only-insecure-password-change-me!!'

const storeKey = (sid: string) => `s:${sid}`

function rawStore() {
  return useStorage<StoredSession>('itd-sessions')
}

/**
 * Мультихранилище сессий для `ItdAccounts`.
 *
 * Контейнер сам нарезает его по имени аккаунта (= `sid`) и подставляет каждому клиенту
 * изолированный срез. Здесь же живёт TTL: просроченную запись `get` удаляет и отдаёт
 * `null`, а `set` обновляет отметку времени.
 */
export const sessionStore: MultiTokenStorage = {
  async get(account) {
    const item = await rawStore().getItem(storeKey(account))
    if (!item) return null

    if (Date.now() - item.updatedAt > SESSION_TTL) {
      await rawStore().removeItem(storeKey(account))
      return null
    }

    return item.itd
  },

  async set(account, session) {
    await rawStore().setItem(
      storeKey(account),
      { itd: session, updatedAt: Date.now() },
      // Драйверы Redis и Upstash сами уберут запись; для памяти это ничего не значит,
      // поэтому возраст всё равно проверяется при чтении.
      { ttl: SESSION_TTL / 1000 },
    )
  },

  async clear(account) {
    await rawStore().removeItem(storeKey(account))
  },

  async accounts() {
    const keys = await rawStore().getKeys()
    return keys.map(key => (key.startsWith('s:') ? key.slice(2) : key))
  },
}

/**
 * Cookie с идентификатором сессии: `httpOnly`, браузер её не читает.
 *
 * Со значением пароля по умолчанию боевой запуск равносилен раздаче чужих сессий: пароль
 * лежит в репозитории, а значит cookie подделает кто угодно. Поэтому вне разработки
 * приложение с ним падает.
 */
export function itdSession(event: H3Event) {
  const password = useRuntimeConfig(event).sessionPassword

  if (!import.meta.dev && password === INSECURE_PASSWORD) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SESSION_PASSWORD_NOT_SET',
      data: {
        code: 'SESSION_PASSWORD_NOT_SET',
        message: 'Задайте NUXT_SESSION_PASSWORD — иначе cookie посетителей подделываются',
      },
    })
  }

  return useSession<WebSession>(event, {
    name: 'itd_example',
    password,
    cookie: { sameSite: 'lax', secure: !import.meta.dev },
  })
}

/** Идентификатор сессии посетителя, если он уже заведён. */
export async function sessionId(event: H3Event): Promise<string | undefined> {
  return (await itdSession(event)).data.sid
}

/**
 * Заводит идентификатор сессии, если его ещё нет.
 *
 * Возвращает `undefined`, когда выставить cookie уже нельзя: у потока событий заголовки
 * уходят раньше, чем случится первое продление токена. Потоку это не мешает —
 * идентификатор к тому моменту давно есть.
 */
export async function ensureSessionId(event: H3Event): Promise<string | undefined> {
  const session = await itdSession(event)
  if (session.data.sid) return session.data.sid
  if (event.node.res.headersSent) return undefined

  const sid = randomUUID()
  await session.update({ sid })
  return sid
}

/** Делает готовые токены сессией текущего посетителя. */
export async function adoptSession(event: H3Event, value: ItdSession): Promise<string> {
  const session = await itdSession(event)
  const sid = session.data.sid ?? randomUUID()

  await session.update({ sid })
  await sessionStore.set(sid, value)

  return sid
}

/** Стирает запись токенов и cookie с идентификатором. */
export async function dropSession(event: H3Event): Promise<string | undefined> {
  const session = await itdSession(event)
  const sid = session.data.sid

  if (sid) await sessionStore.clear(sid)
  await session.clear()

  return sid
}

/** Есть ли вообще что предъявлять API — токен или cookie продления. */
export function hasSession(session: ItdSession | null | undefined): boolean {
  return Boolean(session?.accessToken || session?.refreshToken || session?.cookies?.length)
}
