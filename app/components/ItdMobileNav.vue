<script setup lang="ts">
/** Нижняя панель на узких экранах: боковое меню там не помещается. */
const { profilePath } = useAuth()
const { count } = useNotificationsCount()
const route = useRoute()

const items = computed(() => [
  { to: '/feed', label: 'Лента', icon: 'i-lucide-house', badge: 0 },
  { to: '/search', label: 'Поиск', icon: 'i-lucide-search', badge: 0 },
  { to: '/shop', label: 'Магазин', icon: 'i-lucide-shopping-bag', badge: 0 },
  { to: '/notifications', label: 'Уведомления', icon: 'i-lucide-bell', badge: count.value },
  { to: profilePath.value, label: 'Профиль', icon: 'i-lucide-user', badge: 0 },
])

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <nav
    class="fixed bottom-0 inset-x-0 z-20 flex border-t border-itd-border bg-[var(--itd-glass)] backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
  >
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex-1 flex flex-col items-center gap-1 py-3 transition-opacity"
      :class="isActive(item.to) ? 'text-itd-text' : 'text-itd-muted opacity-70'"
      :aria-label="item.label"
    >
      <span class="relative">
        <UIcon :name="item.icon" class="size-6" :class="item.badge && 'text-itd-accent'" />
        <span
          v-if="item.badge"
          class="absolute -top-1 -right-2 min-w-[16px] h-4 rounded-full bg-itd-like px-1 text-[10px] font-semibold leading-4 text-white text-center"
        >
          {{ item.badge > 99 ? '99+' : item.badge }}
        </span>
      </span>
    </NuxtLink>
  </nav>
</template>
