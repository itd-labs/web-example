<script setup lang="ts">
/**
 * Переключатель вкладок-«таблетка» с бегунком, как в ленте итд.com.
 *
 * Бегунок позиционируется в процентах, поэтому не зависит от ширины контейнера
 * и не требует измерений после отрисовки.
 */
const props = defineProps<{ tabs: readonly { key: string, label: string }[] }>()
const active = defineModel<string>({ required: true })

const index = computed(() => Math.max(0, props.tabs.findIndex(tab => tab.key === active.value)))
const width = computed(() => 100 / props.tabs.length)
</script>

<template>
  <div
    class="relative flex rounded-full p-1 backdrop-blur-md bg-[var(--itd-glass)] border border-white/10"
  >
    <span
      class="absolute top-1 bottom-1 rounded-full bg-[var(--itd-tab-active)] transition-transform duration-200 ease-[cubic-bezier(.5,0,0,1)]"
      :style="{
        width: `calc(${width}% - 0.5rem)`,
        left: '0.25rem',
        transform: `translateX(calc(${index * 100}% + ${index * 0.5}rem))`,
      }"
    />
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      class="relative z-1 flex-1 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer"
      :class="tab.key === active ? 'text-itd-text' : 'text-itd-muted hover:text-itd-text'"
      @click="active = tab.key"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
