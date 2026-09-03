const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 4 * WEEK

const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const dayMonthYear = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const monthYear = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
const fullDateTime = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' })
const clock = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const compact = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 })

/**
 * Короткая отметка времени в ленте: `5 мин.`, `2 ч.`, `3 дн.`, `1 нед.`, `20 дек.`.
 *
 * Повторяет формат итд.com: до месяца — относительное время, дальше — дата.
 */
export function timeAgo(value: string, now: number = Date.now()): string {
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return ''

  const diff = now - time
  if (diff < MINUTE) return 'сейчас'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} мин.`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} ч.`
  if (diff < WEEK) return `${Math.floor(diff / DAY)} дн.`
  if (diff < MONTH) return `${Math.floor(diff / WEEK)} нед.`

  const date = new Date(time)
  return date.getFullYear() === new Date(now).getFullYear()
    ? dayMonth.format(date)
    : dayMonthYear.format(date)
}

/** Полная дата для подсказки над отметкой времени. */
export function fullDate(value: string): string {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? fullDateTime.format(date) : ''
}

/** Месяц и год регистрации: `декабрь 2025 г.`. */
export function joinedAt(value: string): string {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? monthYear.format(date) : ''
}

/** Счётчик в компактной записи: `1,2 тыс.`. До тысячи — как есть. */
export function formatCount(value: number): string {
  return value < 1000 ? String(value) : compact.format(value)
}

/** Время сообщения: `14:03`. */
export function formatTime(value: string): string {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? clock.format(date) : ''
}

/** Заголовок дня над сообщениями: `сегодня`, `вчера` или `3 августа`. */
export function formatDay(value: string, now: number = Date.now()): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''

  const days = Math.round(
    (new Date(now).setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / DAY,
  )

  if (days === 0) return 'сегодня'
  if (days === 1) return 'вчера'
  return date.getFullYear() === new Date(now).getFullYear()
    ? dayLabel.format(date)
    : dayMonthYear.format(date)
}

/** Один ли это день — по нему ставится заголовок между сообщениями. */
export function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

/** Размер файла: `840 Б`, `12,3 КБ`, `4,1 МБ`. */
export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 Б'

  const units = ['Б', 'КБ', 'МБ', 'ГБ']
  const step = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  const size = value / 1024 ** step

  return `${size.toFixed(step === 0 ? 0 : 1).replace('.', ',')} ${units[step]}`
}

/** Длительность аудио или видео в формате `м:сс`. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
