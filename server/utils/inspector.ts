import { AsyncLocalStorage } from 'node:async_hooks'
import type { ClientHooks, ClientPlugin, OperationRequestOptions } from 'itd-api'
import { ItdRateLimitError, isItdApiError } from 'itd-api'
import type { ItdCallMeta } from '#shared/itd'

/**
 * Журнал вызовов библиотеки для панели «под капотом».
 *
 * Плагин ставится на клиент один раз и живёт столько же, сколько клиент, а журнал нужен
 * на один запрос — поэтому текущий журнал переносится через {@link AsyncLocalStorage}:
 * параллельные запросы не путают записи, а плагину не нужно знать про h3.
 */
const journal = new AsyncLocalStorage<ItdCallMeta[]>()

/** Запись операции, внутри которой сейчас идёт сетевая попытка. */
const inFlight = new AsyncLocalStorage<Draft>()

/** Изменяемая запись: обрастает подробностями по ходу операции. */
interface Draft {
  attempts: number
  status?: number
  retryDelays: number[]
}

/** Сколько символов аргументов попадает в журнал. */
const MAX_ARGS = 1024

/** Чем кончился обработчик: журнал нужен и в том, и в другом случае. */
export type Collected<T> =
  | { ok: true, result: T, meta: ItdCallMeta[] }
  | { ok: false, error: unknown, meta: ItdCallMeta[] }

/**
 * Собирает журнал вызовов, сделанных внутри `fn`.
 *
 * Ошибку не бросает, а возвращает: записи о неудачных вызовах нужны панели не меньше
 * успешных. Ничего не хранит — журнал живёт ровно столько, сколько выполняется
 * обработчик, и уезжает в ответ.
 */
export async function collectCalls<T>(fn: () => Promise<T>): Promise<Collected<T>> {
  const meta: ItdCallMeta[] = []

  try {
    return { ok: true, result: await journal.run(meta, fn), meta }
  } catch (error) {
    return { ok: false, error, meta }
  }
}

/**
 * Двоичное ли тело запроса.
 *
 * Такое в журнал не идёт ни при каких условиях: `JSON.stringify` разворачивает байты в
 * массив чисел, и вложение на пару десятков мегабайт превращается в строку, которой не
 * хватит и гигабайта памяти.
 */
function isBinary(value: unknown): boolean {
  return value instanceof FormData
    || value instanceof Blob
    || value instanceof ArrayBuffer
    || ArrayBuffer.isView(value)
    || (typeof ReadableStream !== 'undefined' && value instanceof ReadableStream)
}

/** Чем заменить двоичное тело: размер полезнее, чем его содержимое. */
function describeBinary(value: unknown): unknown {
  if (value instanceof Blob) return { binary: value.type || 'blob', bytes: value.size }
  if (value instanceof ArrayBuffer) return { binary: 'arraybuffer', bytes: value.byteLength }
  if (ArrayBuffer.isView(value)) return { binary: 'bytes', bytes: value.byteLength }
  if (value instanceof FormData) return { binary: 'form-data' }
  return { binary: 'stream' }
}

/**
 * Аргументы вызова в том виде, в каком их показывает панель.
 *
 * У операций авторизации тело не пишется вовсе: там токен посетителя.
 */
function packArgs(request: OperationRequestOptions): unknown {
  if (request.operationId.startsWith('auth.')) return undefined

  const args: Record<string, unknown> = {}
  if (request.query && Object.keys(request.query).length > 0) args.query = request.query

  if (request.body !== undefined) {
    args.body = isBinary(request.body) ? describeBinary(request.body) : request.body
  }

  if (Object.keys(args).length === 0) return undefined

  try {
    const json = JSON.stringify(args)
    return json.length <= MAX_ARGS ? args : { truncated: `${json.slice(0, MAX_ARGS)}…` }
  } catch {
    // Циклическая ссылка или что-то ещё несериализуемое — журналу хватит и признака.
    return { unserializable: true }
  }
}

/** Ошибка вызова для журнала. Типизированная иерархия SDK избавляет от разбора текста. */
function packError(error: unknown) {
  if (isItdApiError(error)) {
    return {
      code: error.code ?? 'ITD_API_ERROR',
      message: error.message,
      retryAfter: error instanceof ItdRateLimitError ? error.retryAfter : undefined,
    }
  }

  return {
    code: 'TRANSPORT_ERROR',
    message: error instanceof Error ? error.message : 'Неизвестная ошибка',
  }
}

/**
 * Плагин, записывающий каждый вызов SDK.
 *
 * Работает на двух уровнях расширений: обёртка логической операции знает имя, аргументы и
 * длительность, а перехватчик попытки — сколько раз пришлось сходить в сеть и с каким
 * статусом. Отсюда же берётся флаг «из кэша»: если сетевых попыток не было ни одной,
 * ответ пришёл из `@itd-api/cache`.
 */
export function inspector(): ClientPlugin {
  return {
    name: 'example-inspector',

    install(api) {
      const off = [
        api.operations.use(async (request, next) => {
          const meta = journal.getStore()
          if (!meta) return next(request)

          const draft: Draft = { attempts: 0, retryDelays: [] }
          const startedAt = Date.now()

          const record = (error?: unknown): void => {
            meta.push({
              op: request.operationId,
              method: request.method,
              path: request.path,
              args: packArgs(request),
              ms: Date.now() - startedAt,
              attempts: draft.attempts,
              cached: draft.attempts === 0,
              status: draft.status,
              retryDelays: draft.retryDelays.length > 0 ? draft.retryDelays : undefined,
              error: error === undefined ? undefined : packError(error),
            })
          }

          try {
            const result = await inFlight.run(draft, () => next(request))
            record()
            return result
          } catch (error) {
            record(error)
            throw error
          }
        }),

        api.attempts.use(async (context, next) => {
          const draft = inFlight.getStore()
          if (draft) draft.attempts = context.attempt

          const response = await next()
          if (draft) draft.status = response.status
          return response
        }),
      ]

      return () => {
        for (const unsubscribe of off) unsubscribe()
      }
    },
  }
}

/**
 * Хуки клиента, дописывающие в журнал паузы между повторами.
 *
 * Пауза известна только самой библиотеке — она же её и выдерживает; панель показывает
 * это как «повтор через 5 с», чтобы было видно, чья это работа.
 */
export const inspectorHooks: ClientHooks = {
  onRetry(context) {
    inFlight.getStore()?.retryDelays.push(context.delay)
  },
}
