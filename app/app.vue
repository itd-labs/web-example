<script setup lang="ts">
useHead({
  title: 'itd-api',
  titleTemplate: title => (title && title !== 'itd-api' ? `${title} · itd-api` : 'itd-api'),
})

// Снизу стопкой уведомления занимают на телефоне пол-экрана и накрывают навигацию.
// Очередь на одно сообщение ведёт `layouts/default.vue`.
const narrow = useNarrowScreen()

const toaster = computed(() => (narrow.value
  ? { position: 'top-center' as const, max: 1, expand: false }
  : { position: 'bottom-right' as const, max: 5, expand: true }))
</script>

<template>
  <UApp :toaster="toaster">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
