<script setup lang="ts">
/** Заглушка карточки поста на время загрузки ленты. */
withDefaults(defineProps<{ count?: number }>(), { count: 3 })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-for="index in count" :key="index" class="itd-card flex gap-2.5">
      <span class="itd-skeleton size-10 shrink-0 rounded-full" />
      <div class="flex-1 flex flex-col gap-3">
        <span class="itd-skeleton h-4 w-40" />
        <span class="itd-skeleton h-3 w-full" />
        <span class="itd-skeleton h-3 w-3/4" />
        <div class="flex gap-4 pt-1">
          <span class="itd-skeleton h-3 w-10" />
          <span class="itd-skeleton h-3 w-10" />
          <span class="itd-skeleton h-3 w-10" />
        </div>
      </div>
    </div>
  </div>
</template>
