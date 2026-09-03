<script setup lang="ts">
import type { UserSummary } from 'itd-api'
import type { ItdPage } from '#shared/itd'

const itdFetch = useItdFetch()

/**
 * Списки подписчиков и подписок.
 *
 * ⚠️ Сервер итд.com эти списки **не листает**: отдаёт первые 20 записей и `hasMore: false`,
 * а `total` расходится со счётчиком в профиле. Поэтому под списком стоит пояснение,
 * а не кнопка «показать ещё» — показывать её было бы обманом.
 */
const props = defineProps<{ user: string }>()

const open = defineModel<boolean>('open', { required: true })
const tab = defineModel<'followers' | 'following'>('tab', { required: true })

const TABS = [
  { key: 'followers', label: 'Подписчики' },
  { key: 'following', label: 'Подписки' },
] as const

const data = ref<ItdPage<UserSummary> | null>(null)
const pending = ref(false)
const error = ref('')

async function load() {
  pending.value = true
  error.value = ''
  data.value = null

  try {
    data.value = await itdFetch<ItdPage<UserSummary>>(
      `/api/users/${encodeURIComponent(props.user)}/${tab.value}`,
    )
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    pending.value = false
  }
}

watch([open, tab, () => props.user], ([isOpen]) => {
  if (isOpen) load()
})

/** Переход в профиль закрывает модалку — иначе она осталась бы поверх новой страницы. */
function go(username: string) {
  open.value = false
  navigateTo(`/@${username}`)
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-md' }">
    <template #content>
      <div class="flex max-h-[80vh] flex-col overflow-hidden bg-itd-block">
        <header class="flex items-center gap-3 border-b border-itd-border p-4">
          <div class="flex flex-1 gap-1">
            <button
              v-for="item in TABS"
              :key="item.key"
              type="button"
              class="flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors cursor-pointer"
              :class="
                item.key === tab
                  ? 'bg-[var(--itd-tab-active)] text-itd-text'
                  : 'text-itd-muted hover:text-itd-text'
              "
              @click="tab = item.key"
            >
              {{ item.label }}
            </button>
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-x"
            aria-label="Закрыть"
            @click="open = false"
          />
        </header>

        <div class="flex-1 overflow-y-auto p-2">
          <div v-if="pending" class="flex flex-col gap-2 p-2">
            <div v-for="index in 5" :key="index" class="flex items-center gap-3">
              <span class="itd-skeleton size-10 shrink-0 rounded-full" />
              <span class="itd-skeleton h-4 flex-1" />
            </div>
          </div>

          <p v-else-if="error" class="p-6 text-center text-sm text-red-500">
            {{ error }}
          </p>

          <ItdEmpty
            v-else-if="!data?.items.length"
            icon="i-lucide-users"
            :title="tab === 'followers' ? 'Подписчиков нет' : 'Подписок нет'"
          />

          <template v-else>
            <button
              v-for="member in data.items"
              :key="member.id"
              type="button"
              class="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-itd-hover cursor-pointer"
              @click="go(member.username)"
            >
              <ItdAvatar :avatar="member.avatar" size="sm" />
              <span class="flex min-w-0 flex-col leading-tight">
                <ItdUserName
                  :display-name="authorName(member)"
                  :verified="member.verified"
                  :has-nuksta="member.hasNuksta"
                />
                <span class="truncate text-sm text-itd-muted">@{{ member.username }}</span>
              </span>
            </button>

            <p class="px-3 py-4 text-center text-xs text-itd-muted">
              Сервер отдаёт только первые {{ data.items.length }} записей — продолжение
              он не листает.
            </p>
          </template>
        </div>
      </div>
    </template>
  </UModal>
</template>
