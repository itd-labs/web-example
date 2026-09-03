<script setup lang="ts">
import type { Post } from 'itd-api'

/**
 * Карточка поста в ленте, профиле и на странице поста.
 *
 * Действия наружу не выполняются: компонент только сообщает о нажатии, а счётчики
 * ему приходят готовыми — так один и тот же пост в разных списках не разъезжается.
 */
const props = withDefaults(
  defineProps<{
    post: Post
    /** Заголовок «Закреплённый пост» над карточкой. */
    pinned?: boolean
    /** Отключает переход на страницу поста — она уже открыта. */
    standalone?: boolean
    busy?: boolean
  }>(),
  { pinned: false, standalone: false, busy: false },
)

const emit = defineEmits<{
  like: [post: Post]
  repost: [post: Post]
  comment: [post: Post]
}>()

const postPath = computed(() => `/@${props.post.author.username}/post/${props.post.id}`)
const authorPath = computed(() => `/@${props.post.author.username}`)

/** Репост показывает исходный пост вложенной карточкой. */
const original = computed(() => props.post.originalPost)

const router = useRouter()

function openPost(event: MouseEvent) {
  if (props.standalone) return
  // Выделение текста не должно уводить со страницы.
  if (window.getSelection()?.toString()) return
  if (event.target instanceof HTMLElement && event.target.closest('a, button, video, audio')) return

  router.push(postPath.value)
}
</script>

<template>
  <article
    class="itd-card flex flex-col gap-4"
    :class="!standalone && 'cursor-pointer'"
    @click="openPost"
  >
    <div v-if="pinned" class="flex items-center gap-2 text-xs text-itd-muted">
      <UIcon name="i-lucide-pin" class="size-3.5" />
      <span>Закреплённый пост</span>
    </div>

    <div class="flex gap-2.5">
      <NuxtLink :to="authorPath" class="self-start" @click.stop>
        <ItdAvatar :avatar="post.author.avatar" size="sm" />
      </NuxtLink>

      <div class="flex-1 min-w-0 flex flex-col gap-2">
        <header class="flex items-center gap-3 min-w-0">
          <NuxtLink :to="authorPath" class="min-w-0 hover:underline" @click.stop>
            <ItdUserName
              :display-name="authorName(post.author)"
              :verified="post.author.verified"
              :pin="post.author.pin"
              :has-nuksta="post.author.hasNuksta"
              size="md"
            />
          </NuxtLink>

          <time
            :datetime="post.createdAt"
            :title="fullDate(post.createdAt)"
            class="shrink-0 ml-auto text-[13px] text-itd-muted whitespace-nowrap"
          >
            {{ timeAgo(post.createdAt) }}
          </time>
        </header>

        <p v-if="post.wallRecipient" class="text-xs text-itd-muted">
          на стене
          <NuxtLink
            :to="`/@${post.wallRecipient.username}`"
            class="text-itd-accent hover:underline"
            @click.stop
          >
            @{{ post.wallRecipient.username }}
          </NuxtLink>
        </p>

        <div class="flex flex-col gap-4">
          <ItdPostText v-if="postText(post).trim()" :text="postText(post)" :spans="postSpans(post)" />

          <ItdPostMedia v-if="post.attachments.length" :attachments="post.attachments" />

          <ItdPostPoll v-if="post.poll" :post-id="post.id" :poll="post.poll" />

          <article
            v-if="original"
            class="flex flex-col gap-2 rounded-xl border border-itd-border p-3"
          >
            <div class="flex items-center gap-2 min-w-0">
              <ItdAvatar :avatar="original.author.avatar" size="xs" />
              <ItdUserName
                :display-name="authorName(original.author)"
                :verified="original.author.verified"
                :pin="original.author.pin"
                size="sm"
              />
              <time class="ml-auto shrink-0 text-xs text-itd-muted">
                {{ timeAgo(original.createdAt) }}
              </time>
            </div>
            <ItdPostText v-if="postText(original).trim()" :text="postText(original)" :spans="postSpans(original)" />
            <ItdPostMedia v-if="original.attachments.length" :attachments="original.attachments" />
          </article>
        </div>

        <footer class="flex items-center justify-between -mx-2.5">
          <div class="flex items-center">
            <button
              type="button"
              aria-label="Нравится"
              class="itd-action"
              :class="post.isLiked && 'text-itd-like itd-pop'"
              :disabled="busy"
              @click.stop="emit('like', post)"
            >
              <UIcon name="i-lucide-heart" class="size-5" :class="post.isLiked && 'fill-current'" />
              <span>{{ formatCount(post.likesCount) }}</span>
            </button>

            <button
              type="button"
              aria-label="Комментировать"
              class="itd-action"
              @click.stop="emit('comment', post)"
            >
              <UIcon name="i-lucide-message-circle" class="size-5" />
              <span>{{ formatCount(post.commentsCount) }}</span>
            </button>

            <button
              type="button"
              aria-label="Репост"
              class="itd-action"
              :class="post.isReposted && 'text-itd-repost'"
              :disabled="busy"
              @click.stop="emit('repost', post)"
            >
              <UIcon name="i-lucide-repeat-2" class="size-5" />
              <span>{{ formatCount(post.repostsCount) }}</span>
            </button>
          </div>

          <div class="flex items-center gap-1">
            <span v-if="post.dominantEmoji" class="text-sm select-none">
              {{ post.dominantEmoji }}
            </span>
            <span class="itd-action pointer-events-none">
              <UIcon name="i-lucide-eye" class="size-5" />
              <span>{{ formatCount(post.viewsCount) }}</span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  </article>
</template>
