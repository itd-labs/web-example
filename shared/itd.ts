/**
 * Формат ответа серверных роутов.
 *
 * `response` — то, что вернул метод SDK, без единого преобразования: своего DTO-слоя в
 * примере нет, страницы типизируются моделями `itd-api`. Рядом едет `meta` — журнал
 * вызовов библиотеки для панели «под капотом».
 *
 * Конверт выбран вместо служебных заголовков: в заголовки нельзя положить не-ASCII
 * (аргументы бывают русскими), они ограничены 8–16 КБ, и одна запись в них не помещает
 * несколько вызовов.
 */
export interface ItdEnvelope<T> {
  response: T
  /** Пусто, когда журнал выключен через `NUXT_PUBLIC_INSPECTOR`. */
  meta: ItdCallMeta[]
}

/**
 * Страница списка в том виде, в каком её отдаёт роут.
 *
 * От `Page<T>` библиотеки отличается ровно одним: снято поле `raw` с копией исходного
 * ответа сервера. Иначе каждый список ехал бы в браузер дважды.
 */
export type ItdPage<T> = Omit<import('itd-api').Page<T>, 'raw'>

/** Одна запись журнала: что библиотека сделала и чем это кончилось. */
export interface ItdCallMeta {
  /** Стабильное имя операции SDK, например `posts.list`. */
  op: string
  /** HTTP-метод операции. */
  method: string
  /** Путь запроса без базового URL, например `/api/users/nowkie`. */
  path: string
  /** Аргументы вызова. Длинные обрезаются — целиком они и не нужны. */
  args?: unknown
  /** Длительность логической операции в миллисекундах. */
  ms: number
  /** Сколько сетевых попыток понадобилось. */
  attempts: number
  /** Ответ пришёл из кэша: сетевых попыток внутри операции не было ни одной. */
  cached: boolean
  /** HTTP-статус последней попытки. */
  status?: number
  /** Паузы между повторами в миллисекундах. */
  retryDelays?: number[]
  error?: ItdCallError
}

/** Ошибка вызова в том виде, в каком её показывает панель. */
export interface ItdCallError {
  code: string
  message: string
  /** Через сколько секунд повторять — приходит с `429`. */
  retryAfter?: number
}

/** Вкладки ленты в том порядке, в каком они идут на сайте. */
export const FEED_TABS = [
  { key: 'popular', label: 'Для вас' },
  { key: 'clan', label: 'Лента кланов' },
  { key: 'following', label: 'Подписки' },
] as const

export type FeedTabKey = (typeof FEED_TABS)[number]['key']

/** Ответ роута подсказок «на кого подписаться». */
export interface SuggestionsResponse {
  users: import('itd-api').UserSummary[]
}

/** Загруженное вложение: `id` уходит в `attachmentIds`, `url` показывается в превью. */
export type UploadedAttachment = import('itd-api').UploadedFile & {
  mimeType: string
  filename: string
}

/** Обычная серверная либо локальная crypto-разметка расшифрованного текста. */
export type TextSpan = import('itd-api').Span | import('@itd-api/crypto').CryptoSpan

/** Готовая нагрузка из поля ввода: текст, вложения и разметка выделенных участков. */
export interface ComposerPayload {
  content: string
  attachmentIds: string[]
  spans?: import('itd-api').Span[]
}

/** Ошибка роута: тот же формат, что у `createError({ data })`. */
export interface ItdErrorData extends ItdCallError {
  /** Ошибки по полям формы, если сервер их прислал. */
  fieldErrors?: Record<string, string[]>
  /** Журнал вызовов до ошибки — панель показывает и неудачные попытки. */
  meta?: ItdCallMeta[]
}
