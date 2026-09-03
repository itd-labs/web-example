<script setup lang="ts">
import type { Span } from 'itd-api'
import { ALLOWED_MIME_TYPES, SpanType } from 'itd-api'
import type { ComposerPayload, UploadedAttachment } from '#shared/itd'

const itdFetch = useItdFetch()

// Загрузка файлов есть только у настоящего API: сервер в памяти такого маршрута не знает.
const { isSandbox } = useMode()

/**
 * Поле ввода поста, комментария или ответа.
 *
 * Отправку выполняет вызывающий код: компонент отдаёт готовую нагрузку и ждёт, пока
 * снимут `pending`. Успешную отправку он узнаёт по вызову `reset()`.
 *
 * Файлы загружаются сразу при выборе — к моменту отправки на руках уже идентификаторы
 * вложений, и публикация не ждёт передачу мегабайтов.
 */
const props = withDefaults(
  defineProps<{
    avatar?: string
    placeholder?: string
    submitLabel?: string
    maxLength?: number
    pending?: boolean
    autofocus?: boolean
    /** Компактный вид: для ответов внутри ветки комментариев. */
    compact?: boolean
    /** Кому адресован ответ — показывается плашкой над полем. */
    replyTo?: string | null
    /** Сколько вложений допустимо. */
    maxFiles?: number
    /** Разрешить разметку выделенного текста через контекстное меню. */
    formatting?: boolean
  }>(),
  {
    avatar: '',
    placeholder: 'Что нового?',
    submitLabel: 'Опубликовать',
    maxLength: 2000,
    pending: false,
    autofocus: false,
    compact: false,
    replyTo: null,
    maxFiles: 4,
    formatting: false,
  },
)

const emit = defineEmits<{ submit: [payload: ComposerPayload], cancelReply: [] }>()

const text = ref('')
const field = ref<HTMLTextAreaElement>()
const fileInput = ref<HTMLInputElement>()

const attachments = ref<UploadedAttachment[]>([])
const uploading = ref(0)
const uploadError = ref('')

const spans = ref<Span[]>([])
const formatMenu = reactive({ open: false, x: 0, y: 0, start: 0, end: 0 })

const FORMAT_ITEMS = [
  { type: SpanType.Bold, label: 'Жирный', icon: 'i-lucide-bold' },
  { type: SpanType.Italic, label: 'Курсив', icon: 'i-lucide-italic' },
  { type: SpanType.Underline, label: 'Подчёркнутый', icon: 'i-lucide-underline' },
  { type: SpanType.Strike, label: 'Зачёркнутый', icon: 'i-lucide-strikethrough' },
  { type: SpanType.Spoiler, label: 'Спойлер', icon: 'i-lucide-eye-off' },
  { type: SpanType.Monospace, label: 'Моноширинный', icon: 'i-lucide-code-2' },
  { type: SpanType.Quote, label: 'Цитата', icon: 'i-lucide-quote' },
  { type: 'crypto', cipher: 'invisible', label: 'Crypto', icon: 'i-lucide-lock-keyhole' },
] as const

const ACCEPT = ALLOWED_MIME_TYPES.join(',')

const canSubmit = computed(() => {
  if (props.pending || uploading.value > 0) return false
  if (text.value.length > props.maxLength) return false
  return text.value.trim().length > 0 || attachments.value.length > 0
})

/** Поле растёт под текст: фиксированная высота обрезала бы длинные посты. */
function grow() {
  const element = field.value
  if (!element) return

  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 400)}px`
}

function submit() {
  if (!canSubmit.value) return

  emit('submit', {
    content: text.value,
    attachmentIds: attachments.value.map(item => item.id),
    ...(props.formatting && spans.value.length > 0 ? { spans: spans.value } : {}),
  })
}

/** Очищает поле — вызывается снаружи после успешной отправки. */
function reset() {
  text.value = ''
  spans.value = []
  attachments.value = []
  uploadError.value = ''
  nextTick(grow)
}

function focus() {
  field.value?.focus()
}

/** Вставляет эмодзи в позицию курсора, а не в конец текста. */
function insertEmoji(emoji: string) {
  const element = field.value

  if (!element) {
    text.value += emoji
    return
  }

  const start = element.selectionStart ?? text.value.length
  const end = element.selectionEnd ?? start

  spans.value = []
  text.value = text.value.slice(0, start) + emoji + text.value.slice(end)

  nextTick(() => {
    element.focus()
    element.setSelectionRange(start + emoji.length, start + emoji.length)
  })
}

/** Ручная правка текста инвалидирует старые смещения; для тестового редактора их сбрасываем. */
function onTextInput() {
  if (spans.value.length > 0) spans.value = []
  formatMenu.open = false
}

function onContextMenu(event: MouseEvent) {
  if (!props.formatting) return

  const element = field.value
  const start = element?.selectionStart ?? 0
  const end = element?.selectionEnd ?? start
  if (start === end) return

  event.preventDefault()
  formatMenu.open = true
  formatMenu.start = start
  formatMenu.end = end
  formatMenu.x = Math.min(event.clientX, window.innerWidth - 210)
  formatMenu.y = Math.min(event.clientY, window.innerHeight - 330)
}

function isSelectedFormat(item: (typeof FORMAT_ITEMS)[number]) {
  return spans.value.some(span =>
    span.type === item.type
    && span.offset === formatMenu.start
    && span.length === formatMenu.end - formatMenu.start
    && (!('cipher' in item) || span.cipher === item.cipher),
  )
}

function applyFormat(item: (typeof FORMAT_ITEMS)[number]) {
  const offset = formatMenu.start
  const length = formatMenu.end - formatMenu.start
  if (length <= 0) return

  const selected = isSelectedFormat(item)
  let next = spans.value.filter(span => !(
    span.type === item.type
    && span.offset === offset
    && span.length === length
    && (!('cipher' in item) || span.cipher === item.cipher)
  ))

  // Crypto-диапазоны не могут пересекаться. Новое выделение заменяет старое пересекающееся.
  if (!selected && item.type === 'crypto') {
    next = next.filter(span =>
      span.type !== 'crypto'
      || span.offset + span.length <= offset
      || span.offset >= offset + length,
    )
  }

  if (!selected) {
    next.push({
      type: item.type,
      offset,
      length,
      ...('cipher' in item ? { cipher: item.cipher } : {}),
    })
  }

  spans.value = next.sort((a, b) => a.offset - b.offset || a.length - b.length)
  formatMenu.open = false
  nextTick(() => {
    field.value?.focus()
    field.value?.setSelectionRange(offset, offset + length)
  })
}

async function upload(files: File[]) {
  const free = props.maxFiles - attachments.value.length
  if (free <= 0) return

  uploadError.value = ''

  for (const file of files.slice(0, free)) {
    uploading.value += 1
    try {
      // Файл уходит сырым телом: сервер отдаёт его в SDK потоком, не собирая в памяти.
      // Имя кодируется — в заголовках допустим только ASCII.
      const uploaded = await itdFetch<UploadedAttachment>('/api/upload', {
        method: 'POST',
        body: file,
        headers: {
          'content-type': file.type || 'application/octet-stream',
          'x-filename': encodeURIComponent(file.name),
        },
      })
      attachments.value = [...attachments.value, uploaded]
    } catch (cause) {
      uploadError.value = apiErrorMessage(cause)
    } finally {
      uploading.value -= 1
    }
  }
}

function onFiles(event: Event) {
  const input = event.target as HTMLInputElement
  upload([...(input.files ?? [])])
  // Сброс нужен, чтобы повторный выбор того же файла снова дал событие.
  input.value = ''
}

function onPaste(event: ClipboardEvent) {
  const files = [...(event.clipboardData?.items ?? [])]
    .filter(item => item.kind === 'file')
    .map(item => item.getAsFile())
    .filter((file): file is File => file !== null)

  if (files.length === 0) return

  event.preventDefault()
  upload(files)
}

function onDrop(event: DragEvent) {
  const files = [...(event.dataTransfer?.files ?? [])]
  if (files.length === 0) return

  event.preventDefault()
  upload(files)
}

function removeAttachment(id: string) {
  attachments.value = attachments.value.filter(item => item.id !== id)
}

watch(text, grow)

onMounted(() => {
  window.addEventListener('click', closeFormatMenu)
  window.addEventListener('blur', closeFormatMenu)
  if (props.autofocus) focus()
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeFormatMenu)
  window.removeEventListener('blur', closeFormatMenu)
})

function closeFormatMenu() {
  formatMenu.open = false
}

defineExpose({ reset, focus })
</script>

<template>
  <div
    class="flex items-start gap-2.5"
    :class="!compact && 'itd-card'"
    @drop="onDrop"
    @dragover.prevent
  >
    <ItdAvatar v-if="avatar" :avatar="avatar" :size="compact ? 'xs' : 'sm'" />

    <div class="flex-1 min-w-0 flex flex-col gap-3">
      <div
        v-if="replyTo"
        class="flex items-center gap-2 self-start rounded-full bg-itd-bg-2 px-3 py-1 text-xs text-itd-muted"
      >
        <span>В ответ {{ replyTo }}</span>
        <button
          type="button"
          class="cursor-pointer hover:text-itd-text"
          aria-label="Отменить ответ"
          @click="emit('cancelReply')"
        >
          <UIcon name="i-lucide-x" class="size-3.5" />
        </button>
      </div>

      <textarea
        ref="field"
        v-model="text"
        :placeholder="placeholder"
        :maxlength="maxLength"
        rows="1"
        class="w-full resize-none bg-transparent text-[15px] leading-relaxed text-itd-text outline-none placeholder:text-itd-muted"
        :class="compact ? 'py-1' : 'py-2'"
        @paste="onPaste"
        @input="onTextInput"
        @contextmenu="onContextMenu"
        @keydown.ctrl.enter.prevent="submit"
        @keydown.meta.enter.prevent="submit"
      />

      <p v-if="formatting" class="text-xs text-itd-muted">
        Выделите текст и нажмите правую кнопку мыши, чтобы добавить форматирование.
      </p>

      <div v-if="attachments.length || uploading" class="grid grid-cols-4 gap-2">
        <div
          v-for="item in attachments"
          :key="item.id"
          class="relative aspect-square overflow-hidden rounded-xl bg-itd-block-2"
        >
          <video
            v-if="item.mimeType.startsWith('video/')"
            :src="item.url"
            class="size-full object-cover"
            muted
          />
          <div
            v-else-if="item.mimeType.startsWith('audio/')"
            class="flex size-full items-center justify-center"
          >
            <UIcon name="i-lucide-music" class="size-6 text-itd-muted" />
          </div>
          <img v-else :src="item.url" :alt="item.filename" class="size-full object-cover">

          <button
            type="button"
            class="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 cursor-pointer"
            aria-label="Убрать вложение"
            @click="removeAttachment(item.id)"
          >
            <UIcon name="i-lucide-x" class="size-3.5" />
          </button>
        </div>

        <div
          v-for="index in uploading"
          :key="`pending-${index}`"
          class="itd-skeleton flex aspect-square items-center justify-center rounded-xl"
        >
          <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-itd-muted" />
        </div>
      </div>

      <p v-if="uploadError" class="text-xs text-red-500">
        {{ uploadError }}
      </p>

      <input
        ref="fileInput"
        type="file"
        :accept="ACCEPT"
        multiple
        class="hidden"
        @change="onFiles"
      >

      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-0.5">
          <button
            type="button"
            :title="isSandbox ? 'Вложения доступны только со своим токеном' : 'Добавить файл'"
            aria-label="Добавить файл"
            class="flex size-9 items-center justify-center rounded-full text-itd-muted transition-colors hover:bg-itd-bg-2 hover:text-itd-accent cursor-pointer disabled:opacity-40"
            :disabled="isSandbox || attachments.length >= maxFiles"
            @click="fileInput?.click()"
          >
            <UIcon name="i-lucide-image" class="size-5" />
          </button>

          <UPopover>
            <button
              type="button"
              title="Добавить эмодзи"
              aria-label="Добавить эмодзи"
              class="flex size-9 items-center justify-center rounded-full text-itd-muted transition-colors hover:bg-itd-bg-2 hover:text-itd-accent cursor-pointer"
            >
              <UIcon name="i-lucide-smile" class="size-5" />
            </button>

            <template #content>
              <ItdEmojiPicker @pick="insertEmoji" />
            </template>
          </UPopover>

        </div>

        <div class="flex items-center gap-3">
          <span
            v-if="text.length > maxLength - 200"
            class="text-xs tabular-nums"
            :class="text.length > maxLength ? 'text-red-500' : 'text-itd-muted'"
          >
            {{ maxLength - text.length }}
          </span>
          <UButton
            color="neutral"
            :size="compact ? 'sm' : 'lg'"
            class="rounded-full"
            :loading="pending"
            :disabled="!canSubmit"
            :label="submitLabel"
            @click="submit"
          />
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="formatMenu.open"
        class="fixed z-100 min-w-48 rounded-xl border border-itd-border bg-itd-block p-1.5 shadow-xl"
        :style="{ left: `${formatMenu.x}px`, top: `${formatMenu.y}px` }"
        @click.stop
      >
        <button
          v-for="item in FORMAT_ITEMS"
          :key="item.type"
          type="button"
          class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-itd-text transition-colors hover:bg-itd-hover cursor-pointer"
          :class="isSelectedFormat(item) && 'bg-[var(--itd-tab-active)]'"
          @click="applyFormat(item)"
        >
          <UIcon :name="item.icon" class="size-4 text-itd-muted" />
          <span>{{ item.label }}</span>
          <UIcon v-if="isSelectedFormat(item)" name="i-lucide-check" class="ml-auto size-4" />
        </button>
      </div>
    </Teleport>
  </div>
</template>
