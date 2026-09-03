import type { FetchOptions } from 'ofetch'
import type { ItdCallMeta, ItdEnvelope } from '#shared/itd'

/** Настройки запроса: всё от `ofetch` плюс отметка «не писать в журнал». */
export interface ItdFetchOptions extends FetchOptions {
  /**
   * Не писать удачный вызов в журнал панели.
   *
   * Нужно опросу уведомлений: он ходит за счётчиком каждые несколько секунд, и в журнале
   * от него не остаётся ничего, кроме шума. Ошибки пишутся всё равно — `429` от опроса
   * как раз стоит увидеть.
   */
  silent?: boolean
}

/**
 * Запрос к своим роутам.
 *
 * Роут отдаёт конверт `{ response, meta }`: `response` — нетронутый ответ библиотеки,
 * `meta` — журнал вызовов. Наружу уходит только `response`, поэтому страницы работают с
 * моделями SDK и про панель ничего не знают.
 *
 * `useRequestFetch()` вместо голого `$fetch` — чтобы при серверном рендере на свой же API
 * ушла cookie посетителя.
 */
export function useItdFetch() {
  const request = useRequestFetch()
  const { push } = useInspector()

  return async function itdFetch<T>(url: string, options?: ItdFetchOptions): Promise<T> {
    const { silent, ...rest } = options ?? {}

    try {
      const envelope = await request<ItdEnvelope<T>>(url, rest as never)
      if (!silent) push(envelope.meta, envelope.response)
      return envelope.response
    } catch (error) {
      // Неудачные вызовы журналу нужны не меньше удачных: 429 и 404 видно тут же.
      push(errorMeta(error))
      throw error
    }
  }
}

/** Журнал, приехавший вместе с ошибкой роута. */
function errorMeta(error: unknown): ItdCallMeta[] {
  const meta = (error as { data?: { data?: { meta?: ItdCallMeta[] } } })?.data?.data?.meta
  return Array.isArray(meta) ? meta : []
}

/** Человекочитаемое сообщение из ошибки нашего API. */
export function apiErrorMessage(error: unknown): string {
  const data = (error as { data?: { data?: { message?: string }, message?: string } })?.data
  return data?.data?.message ?? data?.message ?? 'Что-то пошло не так'
}

/** Код ошибки API, если он есть. */
export function apiErrorCode(error: unknown): string | undefined {
  return (error as { data?: { data?: { code?: string } } })?.data?.data?.code
}

/** Через сколько секунд можно повторить — приходит с `429`. */
export function apiRetryAfter(error: unknown): number | undefined {
  return (error as { data?: { data?: { retryAfter?: number } } })?.data?.data?.retryAfter
}
