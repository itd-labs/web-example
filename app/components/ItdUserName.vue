<script setup lang="ts">
import type { Pin } from 'itd-api'

/**
 * Имя пользователя со значками.
 *
 * Порядок как на сайте: имя, галочка верификации, значок профиля.
 */
withDefaults(
  defineProps<{
    displayName: string
    verified?: boolean
    pin?: Pin | null
    hasNuksta?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { verified: false, pin: null, hasNuksta: false, size: 'md' },
)

const SIZES = {
  sm: { text: 'text-xs gap-1', icon: 'size-3', pin: 12 },
  md: { text: 'text-[15px] gap-1.5', icon: 'size-3.5', pin: 14 },
  lg: { text: 'text-2xl gap-3 leading-tight', icon: 'size-5', pin: 22 },
} as const
</script>

<template>
  <span class="flex items-center min-w-0 font-medium text-itd-text" :class="SIZES[size].text">
    <span class="truncate">{{ displayName }}</span>
    <UIcon
      v-if="verified"
      name="i-lucide-badge-check"
      class="shrink-0 text-itd-accent"
      :class="SIZES[size].icon"
    />
    <UIcon
      v-if="hasNuksta"
      name="i-lucide-star"
      class="shrink-0 text-[#ffdc5f]"
      :class="SIZES[size].icon"
    />
    <img
      v-if="pin"
      :src="pin.url"
      :alt="pin.name"
      :title="`${pin.name} — ${pin.description}`"
      :width="SIZES[size].pin"
      :height="SIZES[size].pin"
      class="shrink-0 object-contain"
    >
  </span>
</template>
