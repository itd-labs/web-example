<script setup lang="ts">
import { SpanType } from 'itd-api'
import type { TextSpan } from '#shared/itd'

/**
 * Текст поста или комментария с разметкой сервера.
 *
 * Разметку итд.com присылает отдельным списком, а не внутри текста, поэтому здесь
 * текст режется на фрагменты и каждый оформляется по своему типу.
 */
const props = withDefaults(defineProps<{ text: string, spans?: TextSpan[] }>(), { spans: () => [] })

const chunks = computed(() => splitSpans(props.text, props.spans))

/** Открытые спойлеры: индекс фрагмента в списке. */
const revealed = ref(new Set<number>())

function reveal(index: number) {
  revealed.value = new Set(revealed.value).add(index)
}

const STYLES: Partial<Record<string, string>> = {
  [SpanType.Bold]: 'font-bold',
  [SpanType.Italic]: 'italic',
  [SpanType.Underline]: 'underline',
  [SpanType.Strike]: 'line-through',
  [SpanType.Monospace]: 'font-mono text-[0.9em] bg-itd-bg-2 rounded px-1 py-px',
  [SpanType.Quote]: 'border-l-3 border-itd-accent pl-3 text-itd-muted italic',
}

/** Enter и пробел на нажимаемом участке: `span` сам их в click не переводит. */
function onTapKey(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return

  event.preventDefault()
  const target = event.currentTarget as HTMLElement
  target.click()
}

function chunkClasses(types: string[]) {
  return [
    ...types.map(type => STYLES[type]).filter(Boolean),
    ...(types.includes('crypto')
      ? ['rounded bg-itd-accent/10 px-0.5 decoration-itd-accent underline decoration-dotted underline-offset-3']
      : []),
  ]
}
</script>

<template>
  <p class="text-itd-text text-[15px] leading-relaxed whitespace-pre-wrap break-words">
    <template v-for="(chunk, index) in chunks" :key="index">
      <NuxtLink
        v-if="isLinkChunk(chunk) && chunkHref(chunk)"
        :to="chunkHref(chunk)"
        :external="chunk.type === SpanType.Link"
        :target="chunk.type === SpanType.Link ? '_blank' : undefined"
        rel="noopener noreferrer"
        :class="['text-itd-accent hover:underline', chunkClasses(chunk.types)]"
        @click.stop
      >{{ chunk.text }}</NuxtLink>

      <!-- Внутри абзаца нажимаемые участки — `span`: кнопку браузер рисует виджетом,
           и длинный фрагмент переставал переноситься по словам. -->
      <span
        v-else-if="chunk.types.includes(SpanType.Spoiler)"
        role="button"
        tabindex="0"
        class="rounded px-0.5 transition-colors"
        :class="[
          revealed.has(index)
            ? 'bg-itd-bg-2 text-itd-text'
            : 'itd-tap-text bg-itd-text text-transparent cursor-pointer',
          chunkClasses(chunk.types.filter(type => type !== SpanType.Spoiler)),
        ]"
        @click.stop="reveal(index)"
        @keydown="onTapKey"
      >{{ chunk.text }}</span>

      <!-- Про шифр рассказывает подсказка: `title` на телефоне не показывается. -->
      <UPopover v-else-if="chunk.types.includes('crypto')">
        <span
          role="button"
          tabindex="0"
          class="itd-tap-text cursor-help"
          :class="chunkClasses(chunk.types)"
          :aria-label="`Расшифровано, шифр ${chunk.cipher ?? 'неизвестен'}`"
          @click.stop
          @keydown="onTapKey"
        >{{ chunk.text }}</span>

        <template #content>
          <div class="flex max-w-64 flex-col gap-1 px-3 py-2">
            <span class="flex items-center gap-1.5 text-sm font-medium text-itd-text">
              <UIcon name="i-lucide-lock-keyhole" class="size-3.5 text-itd-accent" />
              Шифр: {{ chunk.cipher ?? 'неизвестен' }}
            </span>
            <span class="text-xs text-itd-muted">
              Участок был зашифрован в посте. Расшифровал его плагин
              <code>@itd-api/crypto</code> — SDK кладёт результат в <code>decoded</code>.
            </span>
          </div>
        </template>
      </UPopover>

      <span
        v-else-if="chunk.types.length"
        :class="chunkClasses(chunk.types)"
      >{{ chunk.text }}</span>

      <template v-else>{{ chunk.text }}</template>
    </template>
  </p>
</template>
