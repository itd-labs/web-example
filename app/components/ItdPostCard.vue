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
  deleted: [id: string]
}>()

const postPath = computed(() => `/@${props.post.author.username}/post/${props.post.id}`)
const authorPath = computed(() => `/@${props.post.author.username}`)

/** Репост показывает исходный пост вложенной карточкой. */
const original = computed(() => props.post.originalPost)

const router = useRouter()
const itdFetch = useItdFetch()
const menuOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')

async function deletePost() {
  if (!props.post.isOwner || deleting.value) return

  deleting.value = true
  deleteError.value = ''

  try {
    await itdFetch(`/api/posts/${encodeURIComponent(props.post.id)}`, { method: 'DELETE' })
    menuOpen.value = false
    emit('deleted', props.post.id)
  } catch (cause) {
    deleteError.value = apiErrorMessage(cause)
  } finally {
    deleting.value = false
  }
}

/** Клик по карточке уводит на её страницу, кроме кликов по ссылкам и выделения текста. */
function opensPage(event: MouseEvent) {
  if (window.getSelection()?.toString()) return false
  if (event.target instanceof HTMLElement && event.target.closest('a, button, video, audio')) return false

  return true
}

function openPost(event: MouseEvent) {
  if (props.standalone) return
  if (!opensPage(event)) return

  router.push(postPath.value)
}

/** Вложенная карточка ведёт к исходному посту — в том числе на странице репоста. */
function openOriginal(event: MouseEvent) {
  const source = original.value
  if (!source || !opensPage(event)) return

  router.push(`/@${source.author.username}/post/${source.id}`)
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

          <UPopover v-if="post.isOwner" v-model:open="menuOpen">
            <button
              type="button"
              aria-label="Действия с постом"
              class="flex size-7 shrink-0 items-center justify-center rounded-full text-itd-muted transition-colors hover:bg-itd-bg-2 hover:text-itd-text cursor-pointer"
              :disabled="deleting"
              @click.stop
            >
              <UIcon name="i-lucide-ellipsis" class="size-4" />
            </button>

            <template #content>
              <button
                type="button"
                class="flex min-w-36 items-center gap-2 px-3 py-2 text-sm text-red-500 transition-colors hover:bg-itd-bg-2 cursor-pointer disabled:opacity-50"
                :disabled="deleting"
                @click.stop="deletePost"
              >
                <UIcon name="i-lucide-trash-2" class="size-4" />
                <span>{{ deleting ? 'Удаляем…' : 'Удалить' }}</span>
              </button>
            </template>
          </UPopover>
        </header>

        <p v-if="deleteError" class="text-xs text-red-500">
          {{ deleteError }}
        </p>

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
            class="flex cursor-pointer flex-col gap-2 rounded-lg border border-itd-border p-3 transition-colors hover:bg-itd-bg-2"
            title="Открыть исходный пост"
            @click.stop="openOriginal"
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
              <UIcon name="i-lucide-arrow-up-right" class="size-3.5 shrink-0 text-itd-muted" />
            </div>
            <ItdPostText v-if="postText(original).trim()" :text="postText(original)" :spans="postSpans(original)" />
            <ItdPostMedia v-if="original.attachments.length" :attachments="original.attachments" />

            <!-- Только показ: реакции относятся к самой карточке, а не к вложенной. -->
            <footer class="flex items-center gap-4 text-xs text-itd-muted tabular-nums">
              <span class="flex items-center gap-1.5" :class="original.isLiked && 'text-itd-like'">
                <UIcon
                  name="i-lucide-heart"
                  class="size-4"
                  :class="original.isLiked && 'fill-current'"
                />
                {{ formatCount(original.likesCount) }}
              </span>
              <span class="flex items-center gap-1.5">
                <UIcon name="i-lucide-message-circle" class="size-4" />
                {{ formatCount(original.commentsCount) }}
              </span>
              <span class="flex items-center gap-1.5" :class="original.isReposted && 'text-itd-repost'">
                <UIcon name="i-lucide-repeat-2" class="size-4" />
                {{ formatCount(original.repostsCount) }}
              </span>
              <span class="ml-auto flex items-center gap-1.5">
                <UIcon name="i-lucide-eye" class="size-4" />
                {{ formatCount(original.viewsCount) }}
              </span>
            </footer>
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
