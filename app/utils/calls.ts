import type { ItdCallMeta } from '#shared/itd'

/**
 * Человеческие названия операций SDK.
 *
 * Панель показывает и стабильное имя (`posts.list`), и подпись по-русски: по имени видно,
 * что звать в своём коде, по подписи — что происходит на экране.
 */
const LABELS: Record<string, string> = {
  'users.me': 'Свой профиль',
  'users.get': 'Профиль пользователя',
  'users.follow': 'Подписка',
  'users.unfollow': 'Отписка',
  'users.followers': 'Подписчики',
  'users.following': 'Подписки',
  'users.whoToFollow': 'Кого почитать',
  'users.updateMe': 'Правка профиля',
  'users.pins': 'Значки профиля',
  'users.setPin': 'Выбор значка',
  'users.removePin': 'Снятие значка',
  'users.getPrivacy': 'Настройки приватности',
  'users.updatePrivacy': 'Правка приватности',
  'posts.list': 'Лента',
  'posts.get': 'Пост',
  'posts.byUser': 'Стена пользователя',
  'posts.likedByUser': 'Понравившееся',
  'posts.create': 'Публикация',
  'posts.comment': 'Комментарий',
  'posts.comments': 'Комментарии',
  'posts.remove': 'Удаление поста',
  'posts.like': 'Реакция',
  'posts.unlike': 'Снятие реакции',
  'posts.repost': 'Репост',
  'posts.unrepost': 'Отмена репоста',
  'posts.vote': 'Голос в опросе',
  'comments.replies': 'Ответы',
  'comments.reply': 'Ответ',
  'comments.like': 'Реакция на комментарий',
  'comments.unlike': 'Снятие реакции',
  'comments.remove': 'Удаление комментария',
  'notifications.list': 'Уведомления',
  'notifications.count': 'Счётчик непрочитанных',
  'notifications.markRead': 'Отметка о прочтении',
  'notifications.markAllRead': 'Прочитать всё',
  'hashtags.posts': 'Посты по хэштегу',
  'search.all': 'Поиск',
  'files.upload': 'Загрузка файла',
  'shop.products.list': 'Товары',
}

/** Название операции по-русски. Незнакомой достаётся её же имя. */
export function callLabel(meta: ItdCallMeta): string {
  return LABELS[meta.op] ?? meta.op
}

/**
 * Подпись вызова примерно в том виде, в каком его пишут в коде.
 *
 * Точную сигнатуру метода восстановить неоткуда — библиотека сообщает путь, query и тело,
 * — поэтому аргументы собираются из пути и краткой записи query или body.
 */
export function callSignature(meta: ItdCallMeta): string {
  const targets = pathArguments(meta.path, meta.op).map(value => `'${value}'`)
  const args = shortArgs(meta.args)

  return `${meta.op}(${[...targets, args].filter(Boolean).join(', ')})`
}

/**
 * Опознаваемые аргументы из пути: идентификатор поста, имя пользователя, хэштег.
 *
 * Служебные сегменты отличаются тем, что их слова уже есть в имени операции: у
 * `posts.comments` это `posts` и `comments`, а `post-3` между ними — как раз аргумент.
 */
function pathArguments(path: string, operationId: string): string[] {
  const known = operationId.toLowerCase()

  return path
    .split('/')
    .filter(Boolean)
    .filter(segment => segment !== 'api' && !known.includes(segment.toLowerCase()))
}

/** Аргументы в одну строку. Длинные обрезает сервер, здесь только сжимаем запись. */
function shortArgs(args: unknown): string {
  if (args === undefined || args === null) return ''

  const source = args as { query?: unknown, body?: unknown }
  const value = source.query ?? source.body ?? args

  try {
    const json = JSON.stringify(value)
    if (!json || json === '{}') return ''
    return json.length > 120 ? `${json.slice(0, 120)}…` : json
  } catch {
    return ''
  }
}

/** Значок исхода: успех, повтор или ошибка. */
export function callIcon(meta: ItdCallMeta): { name: string, class: string } {
  if (meta.error) return { name: 'i-lucide-circle-x', class: 'text-red-500' }
  if (meta.attempts > 1) return { name: 'i-lucide-refresh-cw', class: 'text-amber-500' }
  return { name: 'i-lucide-circle-check', class: 'text-itd-repost' }
}

/** Длительность в удобном виде: миллисекунды до секунды, дальше — секунды. */
export function callDuration(ms: number): string {
  return ms < 1000 ? `${ms} мс` : `${(ms / 1000).toFixed(1)} с`
}

/** Короткие пометки: из кэша, сколько было попыток, сколько ждали между ними. */
export function callFlags(meta: ItdCallMeta): string[] {
  const flags: string[] = []

  if (meta.cached) flags.push('из кэша')
  if (meta.attempts > 1) flags.push(`попыток: ${meta.attempts}`)
  if (meta.retryDelays?.length) {
    flags.push(`ожидание ${meta.retryDelays.map(delay => `${Math.round(delay / 1000)}с`).join(' + ')}`)
  }
  if (meta.error?.retryAfter) flags.push(`повтор через ${meta.error.retryAfter} с`)

  return flags
}
