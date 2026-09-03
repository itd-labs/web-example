<script setup lang="ts">
import type { Poll } from 'itd-api'

const itdFetch = useItdFetch()

/**
 * Опрос внутри поста.
 *
 * До голосования варианты — кнопки, после — полосы с долями. Несколько вариантов
 * можно выбрать только у опроса с `multipleChoice`.
 */
const props = defineProps<{ postId: string, poll: Poll }>()

const poll = ref<Poll>(props.poll)
watch(() => props.poll, value => (poll.value = value))

const selected = ref(new Set<string>())
const sending = ref(false)
const error = ref('')

const voted = computed(() => poll.value.hasVoted)
const total = computed(() => poll.value.totalVotes)

function share(votes: number) {
  return total.value > 0 ? Math.round((votes / total.value) * 100) : 0
}

function toggle(optionId: string) {
  if (voted.value || sending.value) return

  const next = new Set(poll.value.multipleChoice ? selected.value : [])
  if (next.has(optionId)) next.delete(optionId)
  else next.add(optionId)
  selected.value = next
}

async function submit() {
  if (selected.value.size === 0 || sending.value) return

  sending.value = true
  error.value = ''

  try {
    poll.value = await itdFetch<Poll>(`/api/posts/${props.postId}/vote`, {
      method: 'POST',
      body: { optionIds: [...selected.value] },
    })
    selected.value = new Set()
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-3" @click.stop>
    <p class="font-medium text-itd-text">
      {{ poll.question }}
    </p>

    <div class="flex flex-col gap-2">
      <button
        v-for="option in poll.options"
        :key="option.id"
        type="button"
        :disabled="voted || sending"
        class="relative overflow-hidden rounded-2xl border border-itd-border px-4 py-3 text-left text-sm transition-colors"
        :class="[
          !voted && !sending && 'cursor-pointer hover:bg-itd-hover',
          selected.has(option.id) && 'border-itd-accent',
          poll.votedOptionIds.includes(option.id) && 'border-itd-accent',
        ]"
        @click="toggle(option.id)"
      >
        <span
          v-if="voted"
          class="absolute inset-y-0 left-0 bg-[var(--itd-poll-track)] transition-[width] duration-300"
          :style="{ width: `${share(option.votesCount)}%` }"
        />
        <span class="relative flex items-center justify-between gap-3">
          <span class="flex items-center gap-2 min-w-0">
            <UIcon
              v-if="poll.votedOptionIds.includes(option.id)"
              name="i-lucide-check"
              class="size-4 shrink-0 text-itd-accent"
            />
            <span class="truncate">{{ option.text }}</span>
          </span>
          <span v-if="voted" class="shrink-0 tabular-nums text-itd-muted">
            {{ share(option.votesCount) }}%
          </span>
        </span>
      </button>
    </div>

    <div class="flex items-center gap-3">
      <UButton
        v-if="!voted"
        size="sm"
        color="neutral"
        :loading="sending"
        :disabled="selected.size === 0"
        label="Проголосовать"
        @click="submit"
      />
      <span class="text-xs text-itd-muted"> {{ formatCount(total) }} голосов </span>
    </div>

    <p v-if="error" class="text-xs text-red-500">
      {{ error }}
    </p>
  </div>
</template>
