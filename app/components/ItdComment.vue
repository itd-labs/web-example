<script setup lang="ts">
import type { Comment, LikeResult } from 'itd-api'
import type { ComposerPayload } from '#shared/itd'

const itdFetch = useItdFetch()

/**
 * Комментарий с ветками ответов.
 *
 * Ответы приходят превью, полный список догружается постранично — у этого списка
 * пагинация не курсорная, в отличие от комментариев к посту.
 */
const props = withDefaults(
  defineProps<{ comment: Comment, myAvatar?: string, depth?: number }>(),
  { myAvatar: '', depth: 0 },
)

interface RepliesPage {
  items: Comment[]
  nextPage: number | null
  hasMore: boolean
}

const comment = ref<Comment>(props.comment)
watch(() => props.comment, value => (comment.value = value))

const replies = ref<Comment[]>(props.comment.replies ?? [])
const nextPage = ref<number | null>(1)
const loadingReplies = ref(false)
const expanded = ref(false)

const liking = ref(false)
const replying = ref(false)
const sending = ref(false)
const error = ref('')

const composer = useTemplateRef<{ reset: () => void, focus: () => void }>('composer')

/** Сколько ответов ещё не показано. */
const hiddenReplies = computed(() => Math.max(0, (comment.value.repliesCount ?? 0) - replies.value.length))

async function toggleLike() {
  if (liking.value) return

  const liked = !comment.value.isLiked
  const before = { isLiked: comment.value.isLiked, likesCount: comment.value.likesCount }

  liking.value = true
  comment.value = {
    ...comment.value,
    isLiked: liked,
    likesCount: Math.max(0, comment.value.likesCount + (liked ? 1 : -1)),
  }

  try {
    const result = await itdFetch<LikeResult>(`/api/comments/${comment.value.id}/like`, {
      method: liked ? 'POST' : 'DELETE',
    })
    comment.value = { ...comment.value, isLiked: result.liked, likesCount: result.likesCount }
  } catch {
    comment.value = { ...comment.value, ...before }
  } finally {
    liking.value = false
  }
}

async function loadReplies() {
  if (loadingReplies.value || nextPage.value === null) return

  loadingReplies.value = true
  try {
    const page = await itdFetch<RepliesPage>(`/api/comments/${comment.value.id}/replies`, {
      query: { page: nextPage.value, limit: 20 },
    })

    const known = new Set(replies.value.map(item => item.id))
    replies.value = [...replies.value, ...page.items.filter(item => !known.has(item.id))]
    nextPage.value = page.nextPage
    expanded.value = true
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    loadingReplies.value = false
  }
}

function startReply() {
  replying.value = true
  nextTick(() => composer.value?.focus())
}

async function sendReply(payload: ComposerPayload) {
  sending.value = true
  error.value = ''

  try {
    const created = await itdFetch<Comment>(`/api/comments/${comment.value.id}/replies`, {
      method: 'POST',
      body: { ...payload, replyToUserId: comment.value.author.id },
    })

    replies.value = [...replies.value, created]
    comment.value = { ...comment.value, repliesCount: (comment.value.repliesCount ?? 0) + 1 }
    expanded.value = true
    replying.value = false
    composer.value?.reset()
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="flex gap-2.5">
    <NuxtLink :to="`/@${comment.author.username}`" class="self-start">
      <ItdAvatar :avatar="comment.author.avatar" size="xs" />
    </NuxtLink>

    <div class="flex-1 min-w-0 flex flex-col gap-2">
      <header class="flex items-center gap-3 min-w-0">
        <NuxtLink :to="`/@${comment.author.username}`" class="min-w-0 hover:underline">
          <ItdUserName
            :display-name="authorName(comment.author)"
            :verified="comment.author.verified"
            :pin="comment.author.pin"
            size="sm"
          />
        </NuxtLink>
        <time
          :datetime="comment.createdAt"
          :title="fullDate(comment.createdAt)"
          class="ml-auto shrink-0 text-xs text-itd-muted"
        >
          {{ timeAgo(comment.createdAt) }}
        </time>
      </header>

      <p v-if="comment.replyTo" class="text-xs text-itd-muted">
        в ответ
        <NuxtLink :to="`/@${comment.replyTo.username}`" class="text-itd-accent hover:underline">
          @{{ comment.replyTo.username }}
        </NuxtLink>
      </p>

      <ItdPostText v-if="commentText(comment).trim()" :text="commentText(comment)" :spans="commentSpans(comment)" />

      <ItdPostMedia v-if="comment.attachments?.length" :attachments="comment.attachments" />

      <div class="flex items-center -mx-2.5">
        <button
          type="button"
          class="itd-action"
          :class="comment.isLiked && 'text-itd-like itd-pop'"
          :disabled="liking"
          aria-label="Нравится"
          @click="toggleLike"
        >
          <UIcon name="i-lucide-heart" class="size-4" :class="comment.isLiked && 'fill-current'" />
          <span>{{ formatCount(comment.likesCount) }}</span>
        </button>

        <button v-if="depth < 2" type="button" class="itd-action" @click="startReply">
          <UIcon name="i-lucide-corner-down-right" class="size-4" />
          <span>Ответить</span>
        </button>
      </div>

      <ItdComposer
        v-if="replying"
        ref="composer"
        compact
        autofocus
        :avatar="myAvatar"
        placeholder="Написать ответ…"
        submit-label="Ответить"
        :max-length="1000"
        :pending="sending"
        :reply-to="`@${comment.author.username}`"
        @submit="sendReply"
        @cancel-reply="replying = false"
      />

      <p v-if="error" class="text-xs text-red-500">
        {{ error }}
      </p>

      <div v-if="replies.length" class="flex flex-col gap-4 border-l border-itd-border pl-4">
        <ItdComment
          v-for="reply in replies"
          :key="reply.id"
          :comment="reply"
          :my-avatar="myAvatar"
          :depth="depth + 1"
        />
      </div>

      <button
        v-if="hiddenReplies > 0 && nextPage !== null"
        type="button"
        class="self-start text-sm text-itd-accent hover:underline cursor-pointer disabled:opacity-50"
        :disabled="loadingReplies"
        @click="loadReplies"
      >
        {{ loadingReplies ? 'Загружаем…' : `Показать ещё ${hiddenReplies} ответов` }}
      </button>
    </div>
  </div>
</template>
