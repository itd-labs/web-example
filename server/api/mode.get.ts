import { LIBRARY_VERSION } from 'itd-api'

/**
 * Чем сейчас пользуется посетитель.
 *
 * Интерфейсу нужно знать, показывать ли баннер песочницы и какие действия отключить.
 * Идёт мимо `defineItdHandler`: вызовов SDK здесь нет, а значит нечего и журналировать.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const sid = await sessionId(event)
  const stored = sid ? await sessionStore.get(sid) : null

  return {
    mode: hasSession(stored) ? ('live' as const) : ('sandbox' as const),
    /** Пускают ли вообще без токена. */
    sandboxEnabled: config.public.sandbox,
    /** Собирается ли журнал вызовов. */
    inspector: config.public.inspector,
    /** Как приходят уведомления: poll, sse или off. */
    realtime: config.realtime,
    /** Версия SDK — панель показывает её в подвале. */
    library: LIBRARY_VERSION,
  }
})
