<script setup lang="ts">
import type { Post } from 'itd-api'
import { FEED_TABS, type ComposerPayload, type FeedTabKey, type ItdPage } from '#shared/itd'

useHead({ title: 'Лента' })

const { me } = useAuth()
const route = useRoute()
const router = useRouter()
const itdFetch = useItdFetch()

/** Вкладка живёт в адресе, чтобы её можно было открыть ссылкой и вернуть «назад». */
const tab = computed<FeedTabKey>({
  get() {
    const value = route.query.tab
    return FEED_TABS.some(item => item.key === value) ? (value as FeedTabKey) : 'popular'
  },
  set(value) {
    router.replace({ query: value === 'popular' ? {} : { tab: value } })
  },
})

const { items, pending, loadingMore, error, hasMore, reload, loadMore, patch, prepend }
  = useCursorList<Post>(
    async (cursor) => {
      const page = await itdFetch<ItdPage<Post>>('/api/feed', {
        query: { tab: tab.value, limit: 20, ...(cursor ? { cursor } : {}) },
      })
      return { items: page.items, next: nextPosition(page) }
    },
    post => post.id,
  )

const { busy, toggleLike, toggleRepost } = usePostActions(patch)

const posting = ref(false)
const postError = ref('')
const composer = useTemplateRef<{ reset: () => void }>('composer')

async function publish(payload: ComposerPayload) {
  posting.value = true
  postError.value = ''

  try {
    const created = await itdFetch<Post>('/api/posts', { method: 'POST', body: payload })
    prepend(created)
    composer.value?.reset()
  } catch (cause) {
    postError.value = apiErrorMessage(cause)
  } finally {
    posting.value = false
  }
}

function openComments(post: Post) {
  router.push(`/@${post.author.username}/post/${post.id}`)
}

watch(tab, () => reload())
onMounted(() => reload())
</script>

<template>
  <div class="flex flex-col">
    <div class="sticky top-0 z-3 p-4 min-[1174px]:top-4">
      <ItdTabs v-model="tab" :tabs="FEED_TABS" />
    </div>

    <div class="flex flex-col gap-4 px-2 min-[1174px]:px-0">
      <ItdComposer
        v-if="me"
        ref="composer"
        :avatar="me.avatar"
        :pending="posting"
        formatting
        placeholder="Что нового?"
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
        icon="i-lucide-newspaper"
        title="Здесь пока пусто"
        description="Подпишитесь на кого-нибудь или загляните во вкладку «Для вас»."
      />

      <template v-else>
        <ItdPostCard
          v-for="post in items"
          :key="post.id"
          :post="post"
          :busy="busy(post.id)"
          @like="toggleLike"
          @repost="toggleRepost"
          @comment="openComments"
        />

        <ItdLoadMore :has-more="hasMore" :loading="loadingMore" @load="loadMore()" />
      </template>
    </div>
  </div>
</template>
