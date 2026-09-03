<script setup lang="ts">
/**
 * Выбор эмодзи: вкладки по разделам и поиск по ключевым словам.
 *
 * Список свой (`app/utils/emoji.ts`) — полный набор Unicode в бандл не тащится.
 */
const emit = defineEmits<{ pick: [emoji: string] }>()

const query = ref('')
const group = ref(EMOJI_GROUPS[0]!.key)

const results = computed(() => {
  const term = query.value.trim().toLowerCase()

  if (term) {
    return EMOJI_GROUPS.flatMap(item => item.items).filter(
      ([emoji, keywords]) => keywords.includes(term) || emoji === term,
    )
  }

  return EMOJI_GROUPS.find(item => item.key === group.value)?.items ?? []
})
</script>

<template>
  <div class="flex w-72 flex-col gap-2 p-2">
    <input
      v-model="query"
      type="search"
      placeholder="Поиск эмодзи"
      class="w-full rounded-xl border border-itd-border bg-transparent px-3 py-2 text-sm text-itd-text outline-none placeholder:text-itd-muted"
    >

    <div v-if="!query.trim()" class="flex gap-1 border-b border-itd-border pb-2">
      <button
        v-for="item in EMOJI_GROUPS"
        :key="item.key"
        type="button"
        :title="item.label"
        :aria-label="item.label"
        class="flex-1 rounded-lg py-1.5 transition-colors cursor-pointer"
        :class="
          item.key === group
            ? 'bg-[var(--itd-tab-active)] text-itd-text'
            : 'text-itd-muted hover:text-itd-text'
        "
        @click="group = item.key"
      >
        <UIcon :name="item.icon" class="size-4" />
      </button>
    </div>

    <div class="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto">
      <button
        v-for="[emoji] in results"
        :key="emoji"
        type="button"
        class="aspect-square rounded-lg text-xl leading-none transition-colors hover:bg-itd-hover cursor-pointer"
        @click="emit('pick', emoji)"
      >
        {{ emoji }}
      </button>
    </div>

    <p v-if="!results.length" class="py-4 text-center text-sm text-itd-muted">
      Ничего не нашлось
    </p>
  </div>
</template>
