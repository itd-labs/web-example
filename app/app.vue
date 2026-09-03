<script setup lang="ts">
useHead({
  title: 'itd-api',
  titleTemplate: title => (title && title !== 'itd-api' ? `${title} · itd-api` : 'itd-api'),
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
