<script setup lang="ts">
import type { Attachment } from 'itd-api'
import { AttachmentType } from 'itd-api'

/**
 * Вложения поста: сетка как на сайте — одно во всю ширину, дальше по два в ряд.
 *
 * В сетке кадр обрезается, поэтому по клику вложение открывается целиком
 * ({@link ItdMediaViewer}) — иначе высокие картинки видны только серединой.
 */
const props = defineProps<{ attachments: Attachment[] }>()

const visual = computed(() =>
  props.attachments.filter(item => item.type !== AttachmentType.Audio),
)
const audio = computed(() => props.attachments.filter(item => item.type === AttachmentType.Audio))

/** Одиночное вложение сохраняет свои пропорции, в сетке они выравниваются по квадрату. */
const single = computed(() => visual.value.length === 1)

const viewerOpen = ref(false)
const viewerIndex = ref(0)

function openViewer(position: number) {
  viewerIndex.value = position
  viewerOpen.value = true
}
</script>

<template>
  <div v-if="visual.length || audio.length" class="flex flex-col gap-3">
    <div
      v-if="visual.length"
      class="grid gap-1 overflow-hidden rounded-lg"
      :class="single ? 'grid-cols-1' : 'grid-cols-2'"
    >
      <template v-for="(item, position) in visual" :key="item.id">
        <!-- У видео свои элементы управления, поэтому разворачивает его отдельная кнопка. -->
        <div v-if="item.type === AttachmentType.Video" class="relative">
          <video
            :src="item.url"
            controls
            playsinline
            preload="metadata"
            class="w-full h-full bg-black"
            :class="single ? 'max-h-[520px] object-contain' : 'aspect-square object-cover'"
          />
          <button
            type="button"
            aria-label="Открыть во весь экран"
            title="Открыть во весь экран"
            class="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 cursor-pointer"
            @click="openViewer(position)"
          >
            <UIcon name="i-lucide-maximize-2" class="size-4" />
          </button>
        </div>

        <button
          v-else
          type="button"
          class="block w-full cursor-zoom-in"
          :aria-label="item.filename ?? 'Открыть изображение'"
          @click="openViewer(position)"
        >
          <img
            :src="item.url"
            :alt="item.filename ?? ''"
            loading="lazy"
            draggable="false"
            :width="item.width"
            :height="item.height"
            class="w-full bg-itd-block-2"
            :class="single ? 'max-h-[520px] object-contain' : 'aspect-square object-cover'"
          >
        </button>
      </template>
    </div>

    <div
      v-for="item in audio"
      :key="item.id"
      class="flex items-center gap-3 rounded-lg bg-itd-bg-2 px-4 py-3"
    >
      <UIcon name="i-lucide-mic" class="size-4 shrink-0 text-itd-muted" />
      <audio :src="item.url" controls class="w-full" />
      <span v-if="item.duration" class="shrink-0 text-xs text-itd-muted tabular-nums">
        {{ formatDuration(item.duration) }}
      </span>
    </div>

    <ItdMediaViewer v-model:open="viewerOpen" v-model:index="viewerIndex" :items="visual" />
  </div>
</template>
