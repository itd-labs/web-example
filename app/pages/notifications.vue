<script setup lang="ts">
import type { Notification } from 'itd-api'
import type { ItdPage } from '#shared/itd'

const itdFetch = useItdFetch()


useHead({ title: 'Уведомления' })

const { count, refresh, decrease, reset: resetCount } = useNotificationsCount()
const { incoming, drain } = useNotificationsRealtime()

const { items, pending, loadingMore, error, hasMore, reload, loadMore, patch }
  = useCursorList<Notification>(
    async (offset) => {
      const page = await itdFetch<ItdPage<Notification>>('/api/notifications', {
        query: { limit: 20, offset: offset ?? 0 },
      })
      return { items: page.items, next: nextPosition(page) }
    },
    notification => notification.id,
  )

const marking = ref(false)

/** Клик по уведомлению одновременно и открывает событие, и гасит непрочитанность. */
async function markRead(notification: Notification) {
  if (notification.isRead) return

  patch(notification.id, current => ({ ...current, isRead: true }))
  decrease()

  try {
    await itdFetch(`/api/notifications/${notification.id}/read`, { method: 'POST' })
  } catch {
    patch(notification.id, current => ({ ...current, isRead: false }))
    await refresh()
  }
}

async function markAllRead() {
  if (marking.value) return

  marking.value = true
  try {
    await itdFetch('/api/notifications/read-all', { method: 'POST' })
    items.value = items.value.map(item => ({ ...item, isRead: true }))
    resetCount()
  } catch {
    await refresh()
  } finally {
    marking.value = false
  }
}

/**
 * Добавляет пришедшее по потоку в начало списка.
 *
 * Дубли отсеиваются и внутри пачки, и относительно уже показанного: после обрыва
 * `EventSource` переподключается, и сервер может повторить последние события.
 */
function absorb(fresh: Notification[]) {
  if (fresh.length === 0) return

  const known = new Set(items.value.map(item => item.id))
  const unique: Notification[] = []

  for (const item of fresh) {
    if (known.has(item.id)) continue
    known.add(item.id)
    unique.push(item)
  }

  if (unique.length > 0) items.value = [...unique, ...items.value]
}

watch(incoming, queue => queue.length > 0 && absorb(drain()))

onMounted(async () => {
  await Promise.all([reload(), refresh()])
  // То, что накопилось до открытия страницы. Пришедшее во время загрузки уже
  // попало в ответ сервера, поэтому потери здесь нет.
  absorb(drain())
})
</script>

<template>
  <div class="flex flex-col">
    <header
      class="itd-safe-top sticky top-0 z-3 flex items-center justify-between gap-3 px-4 pb-4 backdrop-blur-md bg-[var(--itd-glass)] min-[1174px]:rounded-3xl"
    >
      <h1 class="text-lg font-semibold text-itd-text">
        Уведомления
        <span v-if="count" class="ml-1 text-sm font-normal text-itd-muted">{{ count }}</span>
      </h1>

      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-check-check"
        label="Прочитать всё"
        :loading="marking"
        :disabled="!count"
        @click="markAllRead"
      />
    </header>

    <div class="mt-3 flex flex-col gap-3 px-2 min-[1174px]:px-0">
      <ItdPostSkeleton v-if="pending" :count="4" />

      <div v-else-if="error" class="itd-card flex flex-col items-center gap-3 text-center">
        <UIcon name="i-lucide-triangle-alert" class="size-6 text-itd-muted" />
        <p class="text-itd-text">
          {{ error }}
        </p>
        <UButton color="neutral" variant="subtle" label="Повторить" @click="reload()" />
      </div>

      <ItdEmpty
        v-else-if="!items.length"
        icon="i-lucide-bell-off"
        title="Уведомлений нет"
        description="Когда на ваши записи ответят, вы увидите это здесь."
      />

      <template v-else>
        <ItdNotificationRow
          v-for="notification in items"
          :key="notification.id"
          :notification="notification"
          @read="markRead"
        />

        <ItdLoadMore :has-more="hasMore" :loading="loadingMore" @load="loadMore()" />
      </template>
    </div>
  </div>
</template>
