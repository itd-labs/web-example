<script setup lang="ts">
import type { Post } from 'itd-api'
import type { ItdPage } from '#shared/itd'

const itdFetch = useItdFetch()

const route = useRoute()
const tag = computed(() => String(route.params.tag))

useHead({ title: () => `#${tag.value}` })

const { items, pending, loadingMore, error, hasMore, reload, loadMore, patch }
  = useCursorList<Post>(
    async (cursor) => {
      const page = await itdFetch<ItdPage<Post>>(
        `/api/hashtags/${encodeURIComponent(tag.value)}/posts`,
        { query: { limit: 20, ...(cursor ? { cursor } : {}) } },
      )
      return { items: page.items, next: nextPosition(page) }
    },
    post => post.id,
  )

const { busy, toggleLike, toggleRepost } = usePostActions(patch)

function openComments(post: Post) {
  navigateTo(`/@${post.author.username}/post/${post.id}`)
}

watch(tag, () => reload())
onMounted(() => reload())
</script>

<template>
  <div class="flex flex-col">
    <header
      class="sticky top-0 z-3 flex items-center gap-3 px-4 py-3 backdrop-blur-md bg-[var(--itd-glass)] min-[1174px]:rounded-3xl"
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
        #{{ tag }}
      </h1>
    </header>

    <div class="flex flex-col gap-4 px-2 pt-2 min-[1174px]:px-0">
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
        icon="i-lucide-hash"
        title="Записей с этим тегом нет"
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
