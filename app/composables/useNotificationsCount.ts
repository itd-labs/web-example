import type { EventChannelStatus, Notification } from 'itd-api'
import type { ItdPage } from '#shared/itd'

/** Кадр потока `/api/notifications/stream`. */
type StreamFrame =
  | { type: 'notification', notification: Notification, unreadCount?: number, sound: boolean }
  | { type: 'unreadCount', count: number }
  | { type: 'status', status: EventChannelStatus }

/**
 * Как часто спрашивать счётчик, когда поток не используется.
 *
 * В песочнице сервер свой и лимитов нет, поэтому проверяем часто. В живом режиме частота
 * упирается в ограничения итд.com — они считаются по IP, общему для всех посетителей
 * демо, — поэтому там интервал заметно длиннее.
 */
const POLL_SANDBOX = 5_000
const POLL_LIVE = 30_000

/** Сколько последних уведомлений подтягивать, заметив рост счётчика. */
const POLL_BATCH = 10

/**
 * Счётчик непрочитанных уведомлений для значка в меню.
 *
 * Состояние общее на всё приложение: значок в сайдбаре и страница уведомлений читают и
 * меняют одно и то же число.
 */
export function useNotificationsCount() {
  const count = useState<number>('itd:unread', () => 0)
  const itdFetch = useItdFetch()

  /**
   * Перечитывает счётчик.
   *
   * `silent` ставит опрос: он повторяется каждые несколько секунд, и в журнале вызовов
   * от него остаётся только шум.
   */
  async function refresh(silent = false) {
    try {
      count.value = (await itdFetch<{ count: number }>('/api/notifications/count', { silent })).count
    } catch {
      count.value = 0
    }
    return count.value
  }

  /** Уменьшает счётчик, не опускаясь ниже нуля. */
  function decrease(by = 1) {
    count.value = Math.max(0, count.value - by)
  }

  function reset() {
    count.value = 0
  }

  return { count, refresh, decrease, reset }
}

/** Соединение живёт одно на вкладку, поэтому лежит в модуле, а не в состоянии компонента. */
let source: EventSource | undefined
let timer: ReturnType<typeof setInterval> | undefined
let listeners = 0

/**
 * Идентификаторы уже полученных уведомлений.
 *
 * После обрыва `EventSource` переподключается сам, и сервер может повторить последние
 * события; опрос тем более видит одно и то же дважды. Без этой памяти счётчик рос бы на
 * каждом повторе.
 */
const seen = new Set<string>()

/** Сколько идентификаторов помним. Дальше повтор уже невозможен, а память не растёт. */
const SEEN_LIMIT = 500

/**
 * Кто хочет знать о каждом новом уведомлении.
 *
 * Очередь `incoming` разбирает страница уведомлений — она же её и опустошает, поэтому
 * всплывающим сообщениям нужен собственный канал, а не тот же список.
 */
const subscribers = new Set<(notification: Notification) => void>()

/**
 * Подписывает на новые уведомления.
 *
 * Только в браузере: набор подписчиков лежит в модуле, а он на сервере один на процесс.
 * Регистрация во время SSR копила бы обработчики всех посетителей в общем месте.
 */
export function onNotification(handler: (notification: Notification) => void) {
  if (!import.meta.client) return

  subscribers.add(handler)
  onScopeDispose(() => subscribers.delete(handler))
}

/**
 * Новые уведомления: потоком или опросом.
 *
 * Поток (`NUXT_REALTIME=sse`) держит библиотека на сервере, а браузер читает свой
 * `text/event-stream`. По умолчанию включён опрос: на serverless открытое соединение
 * оплачивается как выполнение и всё равно рвётся каждые пять минут. Для интерфейса
 * разницы нет — уведомления приходят в одну и ту же очередь.
 */
export function useNotificationsRealtime() {
  const { count, refresh } = useNotificationsCount()
  const { info } = useMode()
  const itdFetch = useItdFetch()

  const incoming = useState<Notification[]>('itd:incoming', () => [])
  const status = useState<EventChannelStatus | 'idle'>('itd:realtime-status', () => 'idle')

  /** Кладёт уведомление в очередь, если оно ещё не приходило. */
  function accept(notification: Notification, unreadCount?: number) {
    if (seen.has(notification.id)) return
    if (seen.size >= SEEN_LIMIT) seen.clear()
    seen.add(notification.id)

    incoming.value = [notification, ...incoming.value]
    // Сервер счётчик почти никогда не присылает, поэтому по умолчанию считаем сами.
    count.value = unreadCount ?? count.value + 1

    for (const notify of subscribers) notify(notification)
  }

  function handle(frame: StreamFrame) {
    switch (frame.type) {
      case 'notification':
        accept(frame.notification, frame.unreadCount)
        break
      case 'unreadCount':
        count.value = frame.count
        break
      case 'status':
        status.value = frame.status
        break
    }
  }

  function openStream() {
    source = new EventSource('/api/notifications/stream')

    source.onmessage = (message) => {
      try {
        handle(JSON.parse(message.data) as StreamFrame)
      } catch {
        // Битый кадр — не повод рвать соединение.
      }
    }

    // EventSource переподключается сам; счётчик после разрыва мог устареть.
    source.onerror = () => {
      status.value = 'idle'
      void refresh(true)
    }
  }

  function startPolling() {
    const interval = info.value?.mode === 'sandbox' ? POLL_SANDBOX : POLL_LIVE

    timer = setInterval(async () => {
      const before = count.value
      const now = await refresh(true)
      if (now <= before) return

      // Счётчик вырос — забираем последние записи и раскладываем по подписчикам.
      try {
        const page = await itdFetch<ItdPage<Notification>>('/api/notifications', {
          // Кэш списка живёт полминуты, а нам нужно именно то, что появилось сейчас.
          query: { limit: POLL_BATCH, fresh: 1 },
          silent: true,
        })

        const fresh = [...page.items].reverse()
        for (const notification of fresh) accept(notification, now)
      } catch {
        // Не достали список — счётчик всё равно обновился, покажем его.
      }
    }, interval)
  }

  function connect() {
    if (!import.meta.client) return

    listeners += 1
    if (source || timer) return

    if (info.value?.realtime === 'sse') openStream()
    else if (info.value?.realtime !== 'off') startPolling()
  }

  function disconnect() {
    listeners = Math.max(0, listeners - 1)
    if (listeners > 0) return

    source?.close()
    source = undefined

    if (timer) clearInterval(timer)
    timer = undefined

    status.value = 'idle'
  }

  /** Забирает накопившиеся уведомления, очищая очередь. */
  function drain(): Notification[] {
    const items = incoming.value
    incoming.value = []
    return items
  }

  return { count, status, incoming, connect, disconnect, drain }
}
