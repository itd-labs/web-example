<script setup lang="ts">
/**
 * Панель «под капотом»: журнал вызовов библиотеки.
 *
 * Метаданные приезжают в конверте вместе с ответом того же запроса, ответ — это его тело.
 * На сервере журнал не хранится: здесь всё, что от него остаётся.
 *
 * Панель выезжает справа во всю высоту: снизу она отнимала бы у ленты те самые строки,
 * ради которых её открывают, а на узком экране ещё и налезала на нижнюю навигацию.
 */
const { entries, open, enabled, toggle, restore } = useInspector()
const { info } = useMode()

const expanded = ref<number | null>(null)

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/** Через сколько бездействия кнопка сворачивается в значок и уезжает вправо. */
const IDLE_MS = 5000

const collapsed = ref(false)
let idle: ReturnType<typeof setTimeout> | undefined

/** Открытую панель не сворачиваем: её закрывает посетитель, а не таймер. */
function scheduleCollapse() {
  clearTimeout(idle)
  if (open.value) return

  idle = setTimeout(() => {
    collapsed.value = true
  }, IDLE_MS)
}

/** Любое касание кнопки возвращает её на место и отсчитывает простой заново. */
function wake() {
  collapsed.value = false
  scheduleCollapse()
}

/** Свёрнутая кнопка живёт одним значком `>_`, поэтому подпись у неё пропадает. */
const buttonLabel = computed(() =>
  collapsed.value ? undefined : `Вызовы SDK (${entries.value.length})`,
)

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) toggle()
}

watch(open, wake)

onMounted(() => {
  restore()
  scheduleCollapse()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  clearTimeout(idle)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div v-if="enabled">
    <!-- Ниже 1174 px внизу стоит навигация, поэтому кнопка приподнята над ней. -->
    <div
      v-if="!open"
      class="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+3rem)] z-40 flex justify-end p-3 min-[1174px]:bottom-0"
    >
      <UButton
        class="pointer-events-auto rounded-full shadow-lg transition-all duration-500 ease-out"
        :class="collapsed && 'translate-x-[38%] opacity-70'"
        color="neutral"
        icon="i-lucide-terminal"
        :label="buttonLabel"
        :aria-label="`Вызовы SDK (${entries.length})`"
        @pointerenter="wake"
        @focus="wake"
        @click="toggle"
      />
    </div>

    <!-- Закрытая панель остаётся в разметке ради выезда, поэтому её прячут от
         клавиатуры и скринридера, а не только сдвигают за край экрана. -->
    <aside
      :inert="!open"
      :aria-hidden="!open"
      aria-label="Журнал вызовов itd-api"
      class="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-itd-border bg-itd-block shadow-2xl transition-transform duration-300 ease-out min-[1174px]:max-w-[460px]"
      :class="open ? 'translate-x-0' : 'translate-x-full'"
    >
      <header class="itd-safe-top flex items-center justify-between gap-3 border-b border-itd-border px-4 pb-3">
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
          class="shrink-0"
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-x"
          aria-label="Закрыть панель"
          @click="toggle"
        />
      </header>

      <p v-if="!entries.length" class="px-4 py-6 text-center text-sm text-itd-muted">
        Пока пусто. Откройте ленту или профиль — записи появятся здесь.
      </p>

      <ul
        v-else
        class="flex-1 divide-y divide-itd-border overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]"
      >
        <li v-for="entry in entries" :key="entry.id">
          <button
            type="button"
            class="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-itd-hover"
            @click="expanded = expanded === entry.id ? null : entry.id"
          >
            <UIcon :name="callIcon(entry.meta).name" :class="callIcon(entry.meta).class" class="mt-0.5 size-4 shrink-0" />

            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class="flex flex-wrap items-baseline gap-x-2">
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
    </aside>
  </div>
</template>
