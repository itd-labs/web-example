<script setup lang="ts">
import type { UserSummary } from 'itd-api'

const itdFetch = useItdFetch()

useHead({ title: 'Поиск' })

const query = ref('')
const users = ref<UserSummary[]>([])
const pending = ref(false)
const error = ref('')
const searched = ref(false)

/** Гасит дребезг ввода: запрос уходит, когда набор остановился. */
let timer: ReturnType<typeof setTimeout> | undefined
/** Номер попытки — ответ устаревшего запроса не должен затирать свежий. */
let generation = 0

async function run(term: string) {
  const current = ++generation

  if (!term) {
    users.value = []
    searched.value = false
    pending.value = false
    return
  }

  pending.value = true
  error.value = ''

  try {
    const result = await itdFetch<{ users: UserSummary[] }>('/api/search', {
      query: { q: term, limit: 20 },
    })
    if (current !== generation) return
    users.value = result.users
    searched.value = true
  } catch (cause) {
    if (current !== generation) return
    error.value = apiErrorMessage(cause)
    users.value = []
  } finally {
    if (current === generation) pending.value = false
  }
}

watch(query, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => run(value.trim()), 350)
})

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="flex flex-col">
    <header class="itd-safe-top sticky top-0 z-3 px-4 pb-4 backdrop-blur-md bg-[var(--itd-glass)] min-[1174px]:rounded-3xl">
      <span class="relative block w-full">
        <UIcon
          name="i-lucide-search"
          class="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-itd-muted"
        />
        <input
          v-model="query"
          type="search"
          placeholder="Поиск людей"
          class="itd-input pl-12"
          autofocus
        >
      </span>
    </header>

    <div class="mt-3 flex flex-col gap-2 px-2 min-[1174px]:px-0">
      <div v-if="pending" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-itd-muted" />
      </div>

      <p v-else-if="error" class="px-4 py-8 text-center text-sm text-red-500">
        {{ error }}
      </p>

      <ItdEmpty
        v-else-if="searched && !users.length"
        icon="i-lucide-user-search"
        title="Никого не нашлось"
        description="Попробуйте другое имя."
      />

      <ItdEmpty
        v-else-if="!searched"
        icon="i-lucide-search"
        title="Кого ищем?"
        description="Введите имя пользователя или его @-адрес."
      />

      <NuxtLink
        v-for="user in users"
        :key="user.id"
        :to="`/@${user.username}`"
        class="itd-card flex items-center gap-3 transition-colors hover:bg-itd-block-2"
      >
        <ItdAvatar :avatar="user.avatar" size="sm" />
        <span class="min-w-0 flex flex-col leading-tight">
          <ItdUserName
            :display-name="authorName(user)"
            :verified="user.verified"
            :has-nuksta="user.hasNuksta"
          />
          <span class="truncate text-sm text-itd-muted">@{{ user.username }}</span>
        </span>
        <span v-if="user.followersCount !== undefined" class="ml-auto shrink-0 text-sm text-itd-muted">
          {{ formatCount(user.followersCount) }} подписчиков
        </span>
      </NuxtLink>
    </div>
  </div>
</template>
