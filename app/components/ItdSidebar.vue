<script setup lang="ts">
/** Левое меню: тот же набор разделов и тот же порядок, что на итд.com. */
const { me, profilePath, forgetToken } = useAuth()
const { isSandbox } = useMode()
const { count } = useNotificationsCount()
const colorMode = useColorMode()

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

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <aside
    class="fixed top-0 left-[var(--itd-sidebar-gap)] h-screen w-[var(--itd-sidebar-width)] py-12 flex flex-col justify-between"
  >
    <div>
      <div class="flex items-center gap-4 px-4 text-itd-text">
        <NuxtLink to="/" class="text-2xl font-bold tracking-tight">
          ИТД
        </NuxtLink>
        <span class="text-xs opacity-30">demo</span>
      </div>

      <nav class="mt-8 flex flex-col">
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="itd-nav-item"
          :class="[isActive(item.to) && 'itd-nav-active', item.badge && 'opacity-100']"
        >
          <span class="relative flex items-center justify-center">
            <UIcon
              :name="item.icon"
              class="size-6"
              :class="item.badge && 'text-itd-accent'"
            />
            <span
              v-if="item.badge"
              class="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full bg-itd-like px-1.5 text-[11px] font-semibold leading-[18px] text-white text-center"
            >
              {{ item.badge > 99 ? '99+' : item.badge }}
            </span>
          </span>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
    </div>

    <div class="flex flex-col gap-6">
      <button
        type="button"
        class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-itd-muted transition-colors hover:bg-itd-block hover:text-itd-text cursor-pointer"
        @click="toggleTheme"
      >
        <UIcon
          :name="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
          class="size-5"
        />
        <span>{{ colorMode.value === 'dark' ? 'Светлая тема' : 'Тёмная тема' }}</span>
      </button>

      <NuxtLink
        v-if="isSandbox"
        to="/token"
        class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-itd-muted transition-colors hover:bg-itd-block hover:text-itd-text"
      >
        <UIcon name="i-lucide-key-round" class="size-5" />
        <span>Войти по токену</span>
      </NuxtLink>

      <button
        v-else-if="me"
        type="button"
        class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-itd-muted transition-colors hover:bg-itd-block hover:text-itd-text cursor-pointer"
        title="Токен перестанет храниться в демо; сессия на итд.com останется"
        @click="forgetToken"
      >
        <UIcon name="i-lucide-log-out" class="size-5" />
        <span>Забыть токен</span>
      </button>
    </div>
  </aside>
</template>
