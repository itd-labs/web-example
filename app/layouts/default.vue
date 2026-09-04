<script setup lang="ts">
import type { Notification } from 'itd-api'

/**
 * Каркас приложения: фиксированные боковые панели и лента шириной 650 px по центру.
 *
 * Панели прячутся ниже 1174 px — той же границы, что использует итд.com, — и на их место
 * встаёт нижняя навигация.
 */
const { refresh } = useNotificationsCount()
const { connect, disconnect } = useNotificationsRealtime()
const { info, fetchMode } = useMode()

const toast = useToast()
const route = useRoute()
const narrow = useNarrowScreen()

/** На телефоне на экране одно сообщение: остальные ждут очереди, а не пропадают. */
const queued: Notification[] = []
const QUEUE_LIMIT = 5

function showToast(notification: Notification) {
  const icon = notificationIcon(notification.type)

  toast.add({
    title: notificationText(notification),
    description: notification.preview ?? undefined,
    icon: icon.name,
    duration: 6000,
    onClick: () => navigateTo(notificationUrl(notification)),
  })
}

// Тостер переносит запись в `toasts` только на следующем тике, а пачка уведомлений
// приходит в одном: без своего признака занятости очередь ушла бы в тостер целиком.
let busy = false

function showNext() {
  if (busy) return

  const next = queued.shift()
  if (!next) return

  busy = true
  showToast(next)
}

// Всплывающее сообщение на каждое событие. На самой странице уведомлений оно лишнее:
// там запись и так появляется наверху списка.
onNotification((notification) => {
  if (route.path === '/notifications') return

  if (!narrow.value) {
    showToast(notification)
    return
  }

  if (queued.length >= QUEUE_LIMIT) queued.shift()
  queued.push(notification)
  showNext()
})

watch(() => toast.toasts.value.length, (count) => {
  if (count > 0) return

  busy = false
  showNext()
})

onMounted(async () => {
  // Транспорт уведомлений задаётся сервером, поэтому сначала режим, потом подписка.
  if (!info.value) await fetchMode()

  // Поток и опрос присылают только новое, поэтому начальный счётчик берётся отдельно.
  await refresh()
  connect()
})

onBeforeUnmount(disconnect)
</script>

<template>
  <div class="itd-shell">
    <ItdSidebar class="hidden min-[1174px]:flex" />

    <div class="itd-column">
      <slot />
      <ItdSandboxBanner />
    </div>

    <ItdAside class="hidden min-[1174px]:flex" />

    <ItdMobileNav class="min-[1174px]:hidden" />

    <ItdInspector />
  </div>
</template>
