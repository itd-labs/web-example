import type { H3Event } from 'h3'
import type { ItdEnvelope } from '#shared/itd'

/**
 * Обработчик роута, отдающий ответ библиотеки вместе с журналом вызовов.
 *
 * Внутри обработчика пишется ровно то, ради чего он существует: достать клиент, вызвать
 * `itd.*`, вернуть результат. Конверт, сбор журнала и перевод ошибок в HTTP — здесь.
 *
 * @example
 * export default defineItdHandler(async (event) => {
 *   const itd = await requireItd(event)
 *   return stripRaw(await itd.posts.list({ tab: FeedTab.Popular }))
 * })
 */
export function defineItdHandler<T>(handler: (event: H3Event) => Promise<T>) {
  return defineEventHandler(async (event): Promise<ItdEnvelope<T>> => {
    // Журнал собирается только когда панель включена: без неё это лишняя работа на запрос.
    if (!useRuntimeConfig(event).public.inspector) {
      try {
        return { response: await handler(event), meta: [] }
      } catch (error) {
        throw toH3Error(error)
      }
    }

    const collected = await collectCalls(() => handler(event))
    if (!collected.ok) throw toH3Error(collected.error, collected.meta)

    return { response: collected.result, meta: collected.meta }
  })
}
