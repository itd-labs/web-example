<script setup lang="ts">
import type { SuggestionsResponse } from '#shared/itd'

/** Правая колонка: рекомендации и подвал со ссылками — как на итд.com. */
const itdFetch = useItdFetch()

const { data } = await useAsyncData(
  'suggestions',
  () => itdFetch<SuggestionsResponse>('/api/suggestions'),
  { lazy: true, server: false, default: () => ({ users: [] }) },
)

const suggestions = computed(() => data.value.users.slice(0, 3))
const { profiles: pinnedProfiles } = usePinnedProfiles()
const { isSandbox } = useMode()

const links = [
  { label: 'О демо', to: '/about' },
  { label: 'Вход по токену', to: '/token' },
  { label: 'GitHub', to: 'https://github.com/KiowDev/itd-api' },
]
</script>

<template>
  <aside
    class="fixed top-0 right-[calc(var(--itd-sidebar-gap)-0.5rem)] h-screen w-[calc(var(--itd-sidebar-width)+1rem)] px-2 py-12 flex flex-col justify-between gap-6 overflow-y-auto overflow-x-hidden"
  >
    <div class="flex flex-col gap-8">
      <section v-if="suggestions.length" class="flex flex-col gap-4">
        <h2 class="text-sm font-semibold text-itd-text">
          Кого читать
        </h2>
        <ul class="flex flex-col gap-3">
          <li v-for="user in suggestions" :key="user.id">
            <NuxtLink
              :to="`/@${user.username}`"
              class="flex min-w-0 items-center gap-2 rounded-xl p-2 -m-2 transition-colors hover:bg-itd-block"
            >
              <ItdAvatar :avatar="user.avatar" size="xs" />
              <span class="min-w-0 flex flex-col leading-tight">
                <ItdUserName
                  :display-name="authorName(user)"
                  :verified="user.verified"
                  :has-nuksta="user.hasNuksta"
                  size="sm"
                />
                <span class="truncate text-xs text-itd-muted">@{{ user.username }}</span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section v-if="!isSandbox" class="flex flex-col gap-4">
        <h2 class="flex items-center gap-1.5 text-sm font-semibold text-itd-text">
          <UIcon name="i-lucide-pin" class="size-3.5" />
          Закреплены
        </h2>

        <p v-if="!pinnedProfiles.length" class="text-xs text-itd-muted">
          Пока никого нет
        </p>

        <ul v-else class="flex flex-col gap-3">
          <li v-for="user in pinnedProfiles" :key="user.id">
            <NuxtLink
              :to="`/@${user.username}`"
              class="flex min-w-0 items-center gap-2 rounded-xl p-2 -m-2 transition-colors hover:bg-itd-block"
            >
              <ItdAvatar :avatar="user.avatar" size="xs" />
              <span class="min-w-0 flex flex-col leading-tight">
                <ItdUserName
                  :display-name="authorName(user)"
                  :verified="user.verified"
                  :has-nuksta="user.hasNuksta"
                  size="sm"
                />
                <span class="truncate text-xs text-itd-muted">@{{ user.username }}</span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>

    <div class="flex flex-col gap-6 text-[13px] text-itd-muted break-words">
      <ul class="flex flex-col gap-1.5">
        <li v-for="link in links" :key="link.to">
          <NuxtLink :to="link.to" class="transition-colors hover:text-itd-text">
            {{ link.label }}
          </NuxtLink>
        </li>
      </ul>
      <span>© 2026 ООО «ИТД»</span>
    </div>
  </aside>
</template>
