<script setup lang="ts">
/**
 * Дозагрузка списка при прокрутке.
 *
 * Наблюдатель следит за пустой полосой в конце списка: как только она показалась,
 * запрашивается следующая страница. Кнопка остаётся на случай, когда наблюдателя нет.
 */
const props = defineProps<{ hasMore: boolean, loading: boolean }>()
const emit = defineEmits<{ load: [] }>()

const anchor = useTemplateRef<HTMLElement>('anchor')
let observer: IntersectionObserver | undefined

onMounted(() => {
  if (!anchor.value || typeof IntersectionObserver === 'undefined') return

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some(entry => entry.isIntersecting) && props.hasMore && !props.loading) {
        emit('load')
      }
    },
    { rootMargin: '400px' },
  )

  observer.observe(anchor.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="anchor" class="flex justify-center py-6">
    <span v-if="loading" class="flex items-center gap-2 text-sm text-itd-muted">
      <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
      Загружаем…
    </span>
    <UButton
      v-else-if="hasMore"
      color="neutral"
      variant="ghost"
      label="Показать ещё"
      @click="emit('load')"
    />
  </div>
</template>
