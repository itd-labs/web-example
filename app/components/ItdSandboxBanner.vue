<script setup lang="ts">
/**
 * Сноска о песочнице.
 *
 * Стоит в конце колонки, а не над лентой: наверху и так хватает скруглённых блоков —
 * шапка страницы, вкладки, поле ввода. Здесь она никому не мешает и не тянет на карточку.
 */
const { isSandbox } = useMode()
</script>

<template>
  <p
    v-if="isSandbox"
    class="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-itd-border px-4 py-5 text-xs text-itd-muted"
  >
    <UIcon name="i-lucide-flask-conical" class="size-3.5 shrink-0" />
    <span>Песочница: данные живут в памяти и видны только вам.</span>
    <NuxtLink to="/token" class="text-itd-accent">
      Войти по своему токену
    </NuxtLink>
  </p>
</template>
