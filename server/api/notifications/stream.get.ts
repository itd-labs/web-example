import { EventChannelStatus } from 'itd-api'

/**
 * Поток уведомлений для браузера.
 *
 * Соединение с итд.com держит библиотека (`itd.notifications.events`), а её события
 * перекладываются в собственный `text/event-stream`. Браузеру не нужен ни токен, ни доступ
 * к чужому домену: он читает наш адрес обычным `EventSource`. Обрывы, продление токена и
 * повторные попытки берёт на себя SDK.
 *
 * Конверт `defineItdHandler` тут не подходит: ответ не заканчивается, а длится.
 */
export default defineEventHandler(async (event) => {
  const { itd, mode } = await useItd(event)
  assertLive(mode, 'Поток уведомлений')

  // На serverless открытое соединение оплачивается как выполнение, поэтому по умолчанию
  // включён опрос, а поток — осознанный выбор через NUXT_REALTIME=sse.
  if (useRuntimeConfig(event).realtime !== 'sse') {
    throw forbidden('REALTIME_NOT_SSE', 'Поток выключен: уведомления приходят опросом')
  }

  const stream = itd.notifications.events
  const sse = createEventStream(event)

  /** Отправляет кадр, не роняя поток, если браузер уже отсоединился. */
  const send = (payload: unknown) => {
    sse.push(JSON.stringify(payload)).catch(() => {})
  }

  const unsubscribe = [
    stream.on('notification', ({ notification, unreadCount, sound }) => {
      send({ type: 'notification', notification: withoutRaw(notification), unreadCount, sound })
    }),
    stream.on('unreadCount', count => send({ type: 'unreadCount', count })),
    stream.on('status', status => send({ type: 'status', status })),
  ]

  sse.onClosed(async () => {
    for (const off of unsubscribe) off()
    stream.disconnect()
    await stream.drain()
    await sse.close()
  })

  stream.connect().catch(() => {
    send({ type: 'status', status: EventChannelStatus.Error })
  })

  return sse.send()
})
