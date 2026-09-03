<script setup lang="ts">
/**
 * Аватар пользователя.
 *
 * На итд.com аватар — это эмодзи клана, а не картинка, поэтому здесь текст в круге,
 * а не `<img>`.
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
</script>

<template>
  <span
    class="relative shrink-0 rounded-full bg-itd-block-2 flex items-center justify-center select-none leading-none"
    :class="[style.box, style.text, ring && 'border-[6px] border-itd-bg bg-itd-block']"
  >
    <span>{{ avatar }}</span>
    <span
      v-if="online"
      class="absolute bottom-0 right-0 rounded-full bg-[#22c55e] border-2 border-itd-block"
      :class="style.dot"
    />
  </span>
</template>
