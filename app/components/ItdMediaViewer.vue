<script setup lang="ts">
import type { Attachment } from 'itd-api'
import { AttachmentType } from 'itd-api'

/**
 * Просмотр вложения целиком.
 *
 * В ленте картинки обрезаны под сетку, поэтому по клику открывается оверлей, где
 * изображение вписано в экран без кадрирования. Листается стрелками и клавишами.
 */
const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{ items: Attachment[] }>()
const index = defineModel<number>('index', { required: true })

const current = computed(() => props.items[index.value])
const hasMany = computed(() => props.items.length > 1)

function go(step: number) {
  if (!hasMany.value) return
  index.value = (index.value + step + props.items.length) % props.items.length
}

function onKey(event: KeyboardEvent) {
  if (!open.value) return

  if (event.key === 'Escape') open.value = false
  if (event.key === 'ArrowRight') go(1)
  if (event.key === 'ArrowLeft') go(-1)
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

// Прокрутка под оверлеем только мешает: фон всё равно не виден.
watch(open, (value) => {
  if (import.meta.client) document.body.style.overflow = value ? 'hidden' : ''
})

onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && current"
      class="fixed inset-0 z-100 flex items-center justify-center bg-black/90 p-4"
      @click.self="open = false"
    >
      <button
        type="button"
        aria-label="Закрыть"
        class="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
        @click="open = false"
      >
        <UIcon name="i-lucide-x" class="size-5" />
      </button>

      <button
        v-if="hasMany"
        type="button"
        aria-label="Предыдущее"
        class="absolute left-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
        @click="go(-1)"
      >
        <UIcon name="i-lucide-chevron-left" class="size-5" />
      </button>

      <video
        v-if="current.type === AttachmentType.Video"
        :src="current.url"
        controls
        autoplay
        playsinline
        class="max-h-[90vh] max-w-full rounded-md"
      />
      <img
        v-else
        :src="current.url"
        :alt="current.filename ?? ''"
        class="max-h-[90vh] max-w-full rounded-md object-contain"
      >

      <button
        v-if="hasMany"
        type="button"
        aria-label="Следующее"
        class="absolute right-4 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
        @click="go(1)"
      >
        <UIcon name="i-lucide-chevron-right" class="size-5" />
      </button>

      <span
        v-if="hasMany"
        class="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-xs text-white tabular-nums"
      >
        {{ index + 1 }} / {{ items.length }}
      </span>
    </div>
  </Teleport>
</template>
