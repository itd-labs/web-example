<script setup lang="ts">
/** Заглушка пустого списка. */
withDefaults(defineProps<{ icon?: string, title: string, description?: string }>(), {
  icon: 'i-lucide-inbox',
  description: '',
})
</script>

<template>
  <div class="flex flex-col items-center gap-2 py-16 text-center">
    <UIcon :name="icon" class="size-8 text-itd-muted" />
    <p class="font-medium text-itd-text">
      {{ title }}
    </p>
    <p v-if="description" class="max-w-xs text-sm text-itd-muted">
      {{ description }}
    </p>
  </div>
</template>
