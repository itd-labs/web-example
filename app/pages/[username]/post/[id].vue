<script setup lang="ts">
import { CommentSort, type Comment, type Post } from 'itd-api'
import type { ComposerPayload, ItdPage } from '#shared/itd'

definePageMeta({
  validate: route => typeof route.params.username === 'string'
    && route.params.username.startsWith('@')
    && typeof route.params.id === 'string'
    && route.params.id.length > 0,
})

const route = useRoute()
const { me } = useAuth()
const itdFetch = useItdFetch()

const postId = computed(() => String(route.params.id))

const {
  data: post,
  error: postError,
  refresh: refreshPost,
} = await useAsyncData(
  () => `post:${postId.value}`,
  () => itdFetch<Post>(`/api/posts/${encodeURIComponent(postId.value)}`),
  { lazy: true, server: false, watch: [postId] },
)

useHead({
  title: () => (post.value ? `Пост @${post.value.author.username}` : 'Пост'),
})

const SORTS = [
  { key: CommentSort.Newest, label: 'Новые' },
  { key: CommentSort.Popular, label: 'Популярные' },
  { key: CommentSort.Oldest, label: 'Старые' },
] as const

const sort = ref<CommentSort>(CommentSort.Newest)

const {
  items: comments,
  pending: commentsPending,
  loadingMore,
  error: commentsError,
  hasMore,
  reload,
  loadMore,
  prepend,
  remove: removeComment,
} = useCursorList<Comment>(
  async (cursor) => {
    const page = await itdFetch<ItdPage<Comment>>(
      `/api/posts/${encodeURIComponent(postId.value)}/comments`,
      { query: { limit: 20, sort: sort.value, ...(cursor ? { cursor } : {}) } },
    )
    return { items: page.items, next: nextPosition(page) }
  },
  comment => comment.id,
)

/** Пост на этой странице один, поэтому обновление счётчиков сводится к замене объекта. */
function patchPost(_id: string, update: (value: Post) => Post) {
  if (post.value) post.value = update(post.value)
}

const { busy, toggleLike, toggleRepost } = usePostActions(patchPost)

const sending = ref(false)
const commentError = ref('')
const composer = useTemplateRef<{ reset: () => void, focus: () => void }>('composer')

async function sendComment(payload: ComposerPayload) {
  sending.value = true
  commentError.value = ''

  try {
    const created = await itdFetch<Comment>(
      `/api/posts/${encodeURIComponent(postId.value)}/comments`,
      { method: 'POST', body: payload },
    )

    prepend(created)
    if (post.value) post.value = { ...post.value, commentsCount: post.value.commentsCount + 1 }
    composer.value?.reset()
  } catch (cause) {
    commentError.value = apiErrorMessage(cause)
  } finally {
    sending.value = false
  }
}

function onCommentDeleted(id: string) {
  removeComment(id)
  if (post.value) {
    post.value = { ...post.value, commentsCount: Math.max(0, post.value.commentsCount - 1) }
  }
}

function onPostDeleted() {
  if (post.value) navigateTo(`/@${post.value.author.username}`, { replace: true })
}

watch([sort, postId], () => reload())
onMounted(() => reload())
</script>

<template>
  <div class="flex flex-col">
    <header
      class="itd-safe-top sticky top-0 z-3 flex items-center gap-3 px-4 pb-3 backdrop-blur-md bg-[var(--itd-glass)] min-[1174px]:rounded-3xl"
    >
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-arrow-left"
        aria-label="Назад"
        @click="$router.back()"
      />
      <h1 class="text-lg font-semibold text-itd-text">
        Пост
      </h1>
    </header>

    <div class="flex flex-col gap-4 px-2 pt-2 min-[1174px]:px-0">
      <!-- Как и в профиле: состояние загрузки на сервере и клиенте различается,
           поэтому ветка выбирается по данным, а не по `pending`. -->
      <ItdPostSkeleton v-if="!post && !postError" :count="1" />

      <div v-else-if="postError" class="itd-card flex flex-col items-center gap-3 text-center">
        <UIcon name="i-lucide-file-x" class="size-8 text-itd-muted" />
        <p class="text-itd-text">
          {{ apiErrorMessage(postError) }}
        </p>
        <UButton color="neutral" variant="subtle" label="Повторить" @click="refreshPost()" />
      </div>

      <template v-else-if="post">
        <ItdPostCard
          :post="post"
          standalone
          :busy="busy(post.id)"
          @like="toggleLike"
          @repost="toggleRepost"
          @comment="composer?.focus()"
          @deleted="onPostDeleted"
        />

        <div class="itd-card flex flex-col gap-5">
          <!-- На узком экране сортировки уезжают на свою строку целиком. -->
          <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h2 class="whitespace-nowrap font-semibold text-itd-text">
              Комментарии
              <span class="ml-1 text-sm font-normal text-itd-muted">
                {{ formatCount(post.commentsCount) }}
              </span>
            </h2>

            <div class="flex items-center gap-0.5 min-[1174px]:gap-1">
              <button
                v-for="option in SORTS"
                :key="option.key"
                type="button"
                class="whitespace-nowrap rounded-full px-2.5 py-1 text-xs transition-colors cursor-pointer min-[1174px]:px-3"
                :class="
                  option.key === sort
                    ? 'bg-[var(--itd-tab-active)] text-itd-text'
                    : 'text-itd-muted hover:text-itd-text'
                "
                @click="sort = option.key"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <ItdComposer
            v-if="me"
            ref="composer"
            compact
            :avatar="me.avatar"
            placeholder="Написать комментарий…"
            submit-label="Отправить"
            :max-length="1000"
            :pending="sending"
            @submit="sendComment"
          />

          <p v-if="commentError" class="text-sm text-red-500">
            {{ commentError }}
          </p>

          <div v-if="commentsPending" class="flex flex-col gap-4">
            <div v-for="index in 3" :key="index" class="flex gap-2.5">
              <span class="itd-skeleton size-7 shrink-0 rounded-full" />
              <div class="flex-1 flex flex-col gap-2">
                <span class="itd-skeleton h-3 w-32" />
                <span class="itd-skeleton h-3 w-full" />
              </div>
            </div>
          </div>

          <p v-else-if="commentsError" class="text-sm text-red-500">
            {{ commentsError }}
          </p>

          <p v-else-if="!comments.length" class="py-4 text-center text-sm text-itd-muted">
            Комментариев пока нет
          </p>

          <template v-else>
            <div class="flex flex-col gap-6">
              <ItdComment
                v-for="comment in comments"
                :key="comment.id"
                :comment="comment"
                :my-avatar="me?.avatar ?? ''"
                :can-delete="post.isOwner"
                @deleted="onCommentDeleted"
              />
            </div>

            <ItdLoadMore :has-more="hasMore" :loading="loadingMore" @load="loadMore()" />
          </template>
        </div>
      </template>
    </div>
  </div>
</template>
