<script setup lang="ts">
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

// Всплывающее сообщение на каждое событие. На самой странице уведомлений оно лишнее:
// там запись и так появляется наверху списка.
onNotification((notification) => {
  if (route.path === '/notifications') return

  const icon = notificationIcon(notification.type)

  toast.add({
    title: notificationText(notification),
    description: notification.preview ?? undefined,
    icon: icon.name,
    duration: 6000,
    onClick: () => navigateTo(notificationUrl(notification)),
  })
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
