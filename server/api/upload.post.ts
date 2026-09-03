import { ALLOWED_MIME_TYPES, fromStream } from 'itd-api'

/**
 * Сколько байт принимаем за раз. Больше сервер итд.com всё равно отвергает.
 *
 * На Vercel до этого предела дело не дойдёт: тело запроса к функции там ограничено
 * 4.5 МБ, и файл крупнее отвергнет сама платформа.
 */
const MAX_SIZE = 50 * 1024 * 1024

/**
 * Загрузка вложения потоком.
 *
 * Файл идёт сырым телом запроса — имя и тип приезжают заголовками — и сразу же уходит в
 * `itd.files.upload()` потоковым источником: сервер не собирает его в памяти целиком.
 * Идентификатор из ответа потом передаётся в `attachmentIds` при публикации, поэтому пост
 * не ждёт мегабайты.
 *
 * Повторы для этого вызова выключены намеренно. `fromStream` открывает источник заново на
 * каждую попытку, а тело HTTP-запроса читается ровно один раз — переоткрыть его нечем.
 * Поэтому при обрыве или `429` ошибка сразу уходит в интерфейс, и файл выбирают заново.
 */
export default defineItdHandler(async (event) => {
  const mimeType = (getRequestHeader(event, 'content-type') ?? '').split(';')[0]?.trim() ?? ''
  const declaredSize = Number(getRequestHeader(event, 'content-length'))

  // Имя едет закодированным: не-ASCII в заголовки класть нельзя.
  const header = getRequestHeader(event, 'x-filename')
  const filename = header ? decodeURIComponent(header) : 'file'

  if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw createError({
      statusCode: 415,
      statusMessage: 'UNSUPPORTED_FILE_TYPE',
      data: {
        code: 'UNSUPPORTED_FILE_TYPE',
        message: `Тип ${mimeType || 'неизвестен'} не принимается`,
      },
    })
  }

  if (Number.isFinite(declaredSize) && declaredSize > MAX_SIZE) {
    throw createError({
      statusCode: 413,
      statusMessage: 'FILE_TOO_LARGE',
      data: { code: 'FILE_TOO_LARGE', message: 'Файл больше 50 МБ' },
    })
  }

  const body = getRequestWebStream(event)
  if (!body) {
    throw createError({
      statusCode: 422,
      statusMessage: 'NO_FILE',
      data: { code: 'NO_FILE', message: 'Файл не приложен' },
    })
  }

  const { itd, mode } = await useItd(event)
  assertLive(mode, 'Загрузка файлов')

  let opened = false
  const source = fromStream(
    () => {
      if (opened) {
        throw createError({
          statusCode: 409,
          statusMessage: 'STREAM_CONSUMED',
          data: { code: 'STREAM_CONSUMED', message: 'Тело запроса читается только один раз' },
        })
      }

      opened = true
      return body as ReadableStream<Uint8Array>
    },
    {
      filename,
      contentType: mimeType,
      ...(Number.isFinite(declaredSize) ? { size: declaredSize } : {}),
    },
  )

  // maxBytes страхует от вранья в Content-Length: библиотека оборвёт передачу сама.
  const uploaded = await itd.files.upload(
    source,
    { filename, contentType: mimeType, maxBytes: MAX_SIZE },
    { retry: false },
  )

  return { ...uploaded, mimeType, filename }
})
