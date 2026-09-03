import type { H3Event } from 'h3'
import { createError, isError } from 'h3'
import { ItdRateLimitError, ItdValidationError, isItdApiError } from 'itd-api'
import type { ItdCallMeta } from '#shared/itd'

/**
 * Переводит ошибки библиотеки в ответ HTTP, сохраняя код, ошибки полей и `Retry-After`.
 *
 * Иерархия ошибок SDK типизирована, поэтому разбирать текст сообщения не приходится.
 * Ошибки, поднятые самим приложением (`unauthorized`, `requireParam`), проходят как есть —
 * им дописывается только журнал вызовов.
 */
export function toH3Error(error: unknown, meta: ItdCallMeta[] = []) {
  if (isError(error)) {
    if (meta.length > 0 && error.data && typeof error.data === 'object') {
      Object.assign(error.data as Record<string, unknown>, { meta })
    }
    return error
  }

  if (isItdApiError(error)) {
    return createError({
      statusCode: error.status || 502,
      statusMessage: error.code || 'ITD_API_ERROR',
      data: {
        code: error.code,
        message: error.message,
        fieldErrors: error instanceof ItdValidationError ? error.fieldErrors : undefined,
        retryAfter: error instanceof ItdRateLimitError ? error.retryAfter : undefined,
        meta,
      },
    })
  }

  const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
  return createError({
    statusCode: 502,
    statusMessage: 'ITD_TRANSPORT_ERROR',
    data: { code: 'TRANSPORT_ERROR', message, meta },
  })
}

/** Ошибка «нет сессии» в том же формате, что и остальные. */
export function unauthorized() {
  return createError({
    statusCode: 401,
    statusMessage: 'NO_SESSION',
    data: { code: 'NO_SESSION', message: 'Сессия не найдена — войдите заново' },
  })
}

/** Запрет на запись: песочница часть операций не поддерживает. */
export function forbidden(code: string, message: string) {
  return createError({ statusCode: 403, statusMessage: code, data: { code, message } })
}

/** Читает числовой параметр запроса, зажимая его в допустимые границы. */
export function readLimit(value: unknown, fallback: number, max = 50): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(Math.trunc(parsed), max)
}

/** Обязательный сегмент пути. Пустое значение — ошибка 422, а не поход в API с мусором. */
export function requireParam(event: H3Event, name: string): string {
  const value = getRouterParam(event, name, { decode: true })?.trim()

  if (!value) {
    throw createError({
      statusCode: 422,
      statusMessage: 'MISSING_PARAM',
      data: { code: 'MISSING_PARAM', message: `Не указан параметр ${name}` },
    })
  }

  return value
}
