<script setup lang="ts">
/**
 * Аватар пользователя.
 *
 * На итд.com аватар — обычно эмодзи клана, его рисуем текстом в круге. Если это адрес
 * изображения, показываем картинку.
 */
const props = withDefaults(
  defineProps<{
    avatar: string
    size?: 'xs' | 'sm' | 'md' | 'lg'
    /** Обводка цветом фона страницы — для аватара поверх баннера. */
    ring?: boolean
    online?: boolean
  }>(),
  { size: 'sm', ring: false, online: false },
)

const SIZES = {
  xs: { box: 'size-7', text: 'text-xs', dot: 'size-2' },
  sm: { box: 'size-10', text: 'text-base', dot: 'size-2.5' },
  md: { box: 'size-12', text: 'text-xl', dot: 'size-3' },
  lg: { box: 'size-[100px] min-[1174px]:size-[120px]', text: 'text-4xl', dot: 'size-5' },
} as const

const style = computed(() => SIZES[props.size])
const isImage = computed(() => /^https?:\/\//i.test(props.avatar))
</script>

<template>
  <span
    class="relative shrink-0 rounded-full bg-itd-block-2 flex items-center justify-center select-none leading-none"
    :class="[style.box, style.text, ring && 'border-[6px] border-itd-bg bg-itd-block']"
  >
    <img v-if="isImage" :src="avatar" alt="" class="size-full rounded-full object-cover">
    <span v-else>{{ avatar }}</span>
    <span
      v-if="online"
      class="absolute bottom-0 right-0 rounded-full bg-[#22c55e] border-2 border-itd-block"
      :class="style.dot"
    />
  </span>
</template>
