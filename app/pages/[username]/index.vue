<script setup lang="ts">
import { AccessType, type FollowResult, type MyProfile, type Post, type PublicProfile } from 'itd-api'
import type { ComposerPayload, ItdPage } from '#shared/itd'

definePageMeta({
  // Профиль живёт по адресу вида /@kiow — всё остальное этому маршруту не принадлежит.
  validate: route => typeof route.params.username === 'string'
    && route.params.username.startsWith('@')
    && route.params.username.length > 1,
})

const route = useRoute()
const { me } = useAuth()
const itdFetch = useItdFetch()

const username = computed(() => String(route.params.username).slice(1))
const isMe = computed(() => me.value?.username === username.value)
const { isPinned, toggle: togglePinned, sync: syncPinned } = usePinnedProfiles()
const { isSandbox } = useMode()

const {
  data: profile,
  error: profileError,
  refresh: refreshProfile,
} = await useAsyncData(
  // Ключ включает имя: иначе при переходе на другой профиль показался бы кэш прежнего.
  () => `profile:${username.value}`,
  () => itdFetch<PublicProfile>(`/api/users/${encodeURIComponent(username.value)}`),
  { lazy: true, server: false, watch: [username] },
)

useHead({
  title: () => (profile.value ? `${profileName(profile.value)} (@${profile.value.username})` : 'Профиль'),
})

const profilePinned = computed(() => Boolean(profile.value && isPinned(profile.value.id)))

function toggleProfilePin() {
  if (profile.value) togglePinned(profile.value)
}

/**
 * Виден ли раздел лайков.
 *
 * Настройку `likesVisibility` сервер не проверяет за нас на списке — он просто
 * ответит ошибкой. Поэтому вкладка прячется заранее, чтобы не предлагать
 * заведомо недоступное.
 */
const canSeeLikes = computed(() => {
  if (isMe.value) return true

  const target = profile.value
  if (!target) return false

  switch (target.likesVisibility) {
    case AccessType.Nobody:
      return false
    case AccessType.Followers:
      return target.isFollowing
    case AccessType.Mutual:
      return target.isFollowing && target.isFollowedBy
    default:
      return true
  }
})

const TABS = computed(() =>
  canSeeLikes.value
    ? ([
        { key: 'posts', label: 'Посты' },
        { key: 'liked', label: 'Лайки' },
      ] as const)
    : ([{ key: 'posts', label: 'Посты' }] as const),
)

const tab = ref<'posts' | 'liked'>('posts')

// Настройки приватности могли смениться, пока вкладка открыта, — тогда возвращаемся к постам.
watch(canSeeLikes, (allowed) => {
  if (!allowed && tab.value === 'liked') tab.value = 'posts'
})

const { items, pending, loadingMore, error, hasMore, reload, loadMore, patch, prepend, remove: removePost }
  = useCursorList<Post>(
    async (cursor) => {
      const path = tab.value === 'posts' ? 'posts' : 'liked'
      const page = await itdFetch<ItdPage<Post>>(
        `/api/users/${encodeURIComponent(username.value)}/${path}`,
        {
          query: {
            limit: 20,
            ...(cursor ? { cursor } : {}),
            ...(tab.value === 'posts' && profile.value?.pinnedPostId
              ? { pinnedPostId: profile.value.pinnedPostId }
              : {}),
          },
        },
      )
      return { items: page.items, next: nextPosition(page) }
    },
    post => post.id,
  )

const { busy, toggleLike, toggleRepost } = usePostActions(patch)

const following = ref(false)

/** Подписка с оптимистичным счётчиком: у закрытого профиля вместо неё уходит заявка. */
async function toggleFollow() {
  if (!profile.value || following.value) return

  const target = profile.value
  const next = !target.isFollowing

  following.value = true
  profile.value = {
    ...target,
    isFollowing: next,
    followersCount: Math.max(0, target.followersCount + (next ? 1 : -1)),
  }

  try {
    if (next) {
      const result = await itdFetch<FollowResult>(
        `/api/users/${encodeURIComponent(username.value)}/follow`,
        { method: 'POST' },
      )
      profile.value = {
        ...target,
        isFollowing: result.following,
        followersCount: result.followersCount ?? target.followersCount + 1,
      }
    } else {
      await itdFetch(`/api/users/${encodeURIComponent(username.value)}/follow`, { method: 'DELETE' })
    }
  } catch {
    profile.value = target
  } finally {
    following.value = false
  }
}

const posting = ref(false)
const postError = ref('')
const composer = useTemplateRef<{ reset: () => void }>('composer')

/** На своей странице пост уходит в свою ленту, на чужой — на стену её владельца. */
async function publish(payload: ComposerPayload) {
  posting.value = true
  postError.value = ''

  try {
    const created = await itdFetch<Post>('/api/posts', {
      method: 'POST',
      body: {
        ...payload,
        ...(isMe.value || !profile.value ? {} : { wallRecipientId: profile.value.id }),
      },
    })
    if (tab.value === 'posts') prepend(created)
    composer.value?.reset()
  } catch (cause) {
    postError.value = apiErrorMessage(cause)
  } finally {
    posting.value = false
  }
}

const canWriteWall = computed(
  () => !isMe.value && Boolean(profile.value) && profile.value?.wallAccess !== 'nobody',
)

/** Счётчики подписчиков и подписок кликабельны — они открывают списки. */
const stats = computed(() => [
  {
    label: 'подписчиков',
    value: profile.value?.followersCount ?? 0,
    list: 'followers' as const,
  },
  {
    label: 'подписок',
    value: profile.value?.followingCount ?? 0,
    list: 'following' as const,
  },
  { label: 'постов', value: profile.value?.postsCount ?? 0, list: null },
])

const settingsOpen = ref(false)
const listOpen = ref(false)
const listTab = ref<'followers' | 'following'>('followers')

function openList(kind: 'followers' | 'following' | null) {
  if (!kind) return
  listTab.value = kind
  listOpen.value = true
}

/** После правки профиля счётчики и шапка берутся из свежего ответа. */
function onProfileSaved(updated: MyProfile) {
  if (!profile.value) return

  profile.value = {
    ...profile.value,
    displayName: profileName(updated),
    username: updated.username,
    bio: updated.bio,
    banner: updated.banner,
    pin: updated.pin,
  }

  if (updated.username !== username.value) navigateTo(`/@${updated.username}`, { replace: true })
}

function openComments(post: Post) {
  navigateTo(`/@${post.author.username}/post/${post.id}`)
}

watch(profile, value => value && syncPinned(value))

// Стена ждёт профиль: без `pinnedPostId` сервер не поднимает закреплённый пост наверх,
// а без самого профиля нечем отметить его в списке.
watch(
  [tab, () => profile.value?.id, () => profile.value?.pinnedPostId],
  ([, id]) => {
    if (id) reload()
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex flex-col">
    <!-- Условие не зависит от `pending`: на сервере запрос не выполняется, и разное
         состояние загрузки разошлось бы с разметкой клиента при гидратации. -->
    <div v-if="!profile && !profileError" class="flex flex-col gap-4 p-2">
      <span class="itd-skeleton h-42 w-full rounded-[36px]" />
      <span class="itd-skeleton mx-auto size-24 rounded-full" />
      <span class="itd-skeleton mx-auto h-6 w-48" />
    </div>

    <div v-else-if="profileError" class="itd-card m-2 flex flex-col items-center gap-3 text-center">
      <UIcon name="i-lucide-user-x" class="size-8 text-itd-muted" />
      <p class="text-itd-text">
        {{ apiErrorMessage(profileError) }}
      </p>
      <UButton color="neutral" variant="subtle" label="Повторить" @click="refreshProfile()" />
    </div>

    <template v-else-if="profile">
      <header class="border-b border-itd-border px-2 pb-4 pt-2">
        <div
          class="relative h-42 w-full overflow-hidden rounded-[36px] bg-itd-block min-[1174px]:h-56"
        >
          <img v-if="profile.banner" :src="profile.banner" alt="" class="size-full object-cover">
          <div v-else class="size-full bg-linear-to-r from-itd-accent/25 to-itd-accent/5" />

          <UButton
            v-if="!isSandbox"
            color="neutral"
            variant="solid"
            size="sm"
            class="absolute right-3 top-3 rounded-full opacity-90"
            :icon="profilePinned ? 'i-lucide-pin-off' : 'i-lucide-pin'"
            :aria-label="profilePinned ? 'Открепить профиль' : 'Закрепить профиль'"
            :title="profilePinned ? 'Открепить профиль' : 'Закрепить профиль'"
            @click="toggleProfilePin"
          />
        </div>

        <div class="px-2 min-[1174px]:px-8">
          <div
            class="-mt-[50px] flex items-end justify-center gap-4 min-[1174px]:-mt-[60px] min-[1174px]:justify-between"
          >
            <ItdAvatar :avatar="profile.avatar" size="lg" ring :online="profile.online" />

            <div class="hidden items-center gap-2 pb-2 min-[1174px]:flex">
              <UButton
                v-if="isMe"
                color="neutral"
                size="md"
                class="rounded-full"
                label="Редактировать"
                @click="settingsOpen = true"
              />
              <UButton
                v-else
                color="neutral"
                :variant="profile.isFollowing ? 'subtle' : 'solid'"
                size="md"
                class="rounded-full"
                :loading="following"
                :label="profile.isFollowing ? 'Вы подписаны' : 'Подписаться'"
                @click="toggleFollow"
              />
            </div>
          </div>

          <div class="mt-4 flex flex-col items-center gap-4 min-[1174px]:items-start">
            <div
              class="flex flex-col items-center gap-1.5 min-[1174px]:flex-row min-[1174px]:items-center min-[1174px]:gap-4"
            >
              <ItdUserName
                :display-name="profileName(profile)"
                :verified="profile.verified"
                :pin="profile.pin"
                :has-nuksta="profile.hasNuksta"
                size="lg"
              />
              <span class="text-itd-muted">@{{ profile.username }}</span>
            </div>

            <p
              v-if="profile.bio"
              class="max-w-md whitespace-pre-wrap break-words text-center text-[15px] text-itd-text min-[1174px]:text-left"
            >
              {{ profile.bio }}
            </p>

            <div class="flex justify-center gap-6">
              <component
                :is="stat.list ? 'button' : 'span'"
                v-for="stat in stats"
                :key="stat.label"
                :type="stat.list ? 'button' : undefined"
                class="flex flex-col items-center rounded-lg px-2 py-1 leading-tight min-[1174px]:flex-row min-[1174px]:gap-1.5"
                :class="stat.list && 'cursor-pointer transition-colors hover:bg-itd-bg-2'"
                @click="openList(stat.list)"
              >
                <span class="font-semibold text-itd-text">{{ formatCount(stat.value) }}</span>
                <span class="text-sm text-itd-muted">{{ stat.label }}</span>
              </component>
            </div>

            <span class="flex items-center gap-3 text-[15px] text-itd-muted">
              <UIcon name="i-lucide-calendar" class="size-4 shrink-0" />
              Регистрация: {{ joinedAt(profile.createdAt) }}
            </span>

            <UButton
              v-if="!isMe"
              color="neutral"
              :variant="profile.isFollowing ? 'subtle' : 'solid'"
              size="md"
              block
              class="rounded-full min-[1174px]:hidden"
              :loading="following"
              :label="profile.isFollowing ? 'Вы подписаны' : 'Подписаться'"
              @click="toggleFollow"
            />
          </div>
        </div>
      </header>

      <div class="sticky top-0 z-3 p-4 min-[1174px]:top-4">
        <ItdTabs v-model="tab" :tabs="TABS" />
      </div>

      <div class="flex flex-col gap-4 px-2 min-[1174px]:px-0">
        <ItdComposer
          v-if="me && (isMe || canWriteWall)"
          ref="composer"
          :avatar="me.avatar"
          :pending="posting"
          formatting
          :placeholder="isMe ? 'Что нового?' : `Написать на стене @${profile.username}`"
          submit-label="Опубликовать"
          @submit="publish"
        />

        <p v-if="postError" class="px-4 text-sm text-red-500">
          {{ postError }}
        </p>

        <ItdPostSkeleton v-if="pending" />

        <div v-else-if="error" class="itd-card flex flex-col items-center gap-3 text-center">
          <UIcon name="i-lucide-triangle-alert" class="size-6 text-itd-muted" />
          <p class="text-itd-text">
            {{ error }}
          </p>
          <UButton color="neutral" variant="subtle" label="Повторить" @click="reload()" />
        </div>

        <ItdEmpty
          v-else-if="!items.length"
          :icon="tab === 'posts' ? 'i-lucide-pen-line' : 'i-lucide-heart'"
          :title="tab === 'posts' ? 'Записей нет' : 'Оценённых постов нет'"
        />

        <template v-else>
          <ItdPostCard
            v-for="post in items"
            :key="post.id"
            :post="post"
            :pinned="tab === 'posts' && post.id === profile.pinnedPostId"
            :busy="busy(post.id)"
            @like="toggleLike"
            @repost="toggleRepost"
            @comment="openComments"
            @deleted="removePost"
          />

          <ItdLoadMore :has-more="hasMore" :loading="loadingMore" @load="loadMore()" />
        </template>
      </div>

      <ItdUserListModal v-model:open="listOpen" v-model:tab="listTab" :user="username" />
      <ItdSettingsModal v-if="isMe" v-model:open="settingsOpen" @saved="onProfileSaved" />
    </template>
  </div>
</template>
