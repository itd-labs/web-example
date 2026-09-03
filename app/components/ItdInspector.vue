<script setup lang="ts">
/**
 * Панель «под капотом»: журнал вызовов библиотеки.
 *
 * Метаданные приезжают в конверте вместе с ответом того же запроса, ответ — это его тело.
 * На сервере журнал не хранится: здесь всё, что от него остаётся.
 */
const { entries, open, enabled, toggle, clear, restore } = useInspector()
const { info } = useMode()

const expanded = ref<number | null>(null)

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

onMounted(restore)
</script>

<template>
  <div v-if="enabled" class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-end gap-2 p-3">
    <UButton
      class="pointer-events-auto rounded-full shadow-lg"
      color="neutral"
      :icon="open ? 'i-lucide-chevron-down' : 'i-lucide-terminal'"
      :label="open ? 'Свернуть' : `Вызовы SDK (${entries.length})`"
      @click="toggle"
    />

    <div
      v-if="open"
      class="pointer-events-auto flex max-h-[60vh] w-full flex-col overflow-hidden rounded-lg border border-itd-border bg-itd-block shadow-xl"
    >
      <header class="flex items-center justify-between gap-3 border-b border-itd-border px-4 py-3">
        <div class="flex min-w-0 flex-col">
          <span class="text-sm font-medium text-itd-text">Журнал вызовов itd-api</span>
          <span class="truncate text-xs text-itd-muted">
            <template v-if="info">
              {{ info.mode === 'sandbox' ? 'песочница' : 'живой аккаунт' }} ·
              уведомления: {{ info.realtime }} · SDK {{ info.library }}
            </template>
          </span>
        </div>

        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          label="Очистить"
          :disabled="!entries.length"
          @click="clear"
        />
      </header>

      <p v-if="!entries.length" class="px-4 py-6 text-center text-sm text-itd-muted">
        Пока пусто. Откройте ленту или профиль — записи появятся здесь.
      </p>

      <ul v-else class="divide-y divide-itd-border overflow-y-auto">
        <li v-for="entry in entries" :key="entry.id">
          <button
            type="button"
            class="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-itd-hover"
            @click="expanded = expanded === entry.id ? null : entry.id"
          >
            <UIcon :name="callIcon(entry.meta).name" :class="callIcon(entry.meta).class" class="mt-0.5 size-4 shrink-0" />

            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class="flex items-baseline gap-2">
                <span class="text-sm font-medium text-itd-text">{{ callLabel(entry.meta) }}</span>
                <span class="truncate font-mono text-xs text-itd-muted">{{ callSignature(entry.meta) }}</span>
              </span>

              <span class="flex flex-wrap items-center gap-2 text-xs text-itd-muted">
                <span>{{ callDuration(entry.meta.ms) }}</span>
                <span v-for="flag in callFlags(entry.meta)" :key="flag" class="text-itd-accent">· {{ flag }}</span>
                <span v-if="entry.meta.error" class="text-red-500">· {{ entry.meta.error.message }}</span>
              </span>
            </span>

            <span class="shrink-0 font-mono text-xs text-itd-muted">
              {{ entry.meta.status ?? '—' }}
            </span>
          </button>

          <div v-if="expanded === entry.id" class="flex flex-col gap-3 bg-itd-block-2 px-4 py-3 text-xs">
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-itd-muted">
              <span>{{ entry.meta.method }} {{ entry.meta.path }}</span>
              <span>операция: <code>{{ entry.meta.op }}</code></span>
            </div>

            <div v-if="entry.meta.args !== undefined" class="flex flex-col gap-1">
              <span class="text-itd-muted">Аргументы</span>
              <pre class="max-h-40 overflow-auto rounded-md bg-itd-block p-2 text-itd-text">{{ pretty(entry.meta.args) }}</pre>
            </div>

            <div v-if="entry.response !== undefined" class="flex flex-col gap-1">
              <span class="text-itd-muted">Ответ библиотеки</span>
              <pre class="max-h-72 overflow-auto rounded-md bg-itd-block p-2 text-itd-text">{{ pretty(entry.response) }}</pre>
            </div>

          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
