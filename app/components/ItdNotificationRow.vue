<script setup lang="ts">
import type { Notification } from 'itd-api'

/**
 * Строка списка уведомлений.
 *
 * Текст и ссылку считает библиотека — здесь остаётся выбрать значок по типу события
 * и показать участников: схлопнутое уведомление несёт сразу нескольких.
 */
const props = defineProps<{ notification: Notification }>()
const emit = defineEmits<{ read: [notification: Notification] }>()

const icon = computed(() => notificationIcon(props.notification.type))

/** Больше трёх аватаров в строку не помещается — остальные считаем числом. */
const shownActors = computed(() => props.notification.actors.slice(0, 3))
const extraActors = computed(() => Math.max(0, props.notification.actors.length - 3))
</script>

<template>
  <NuxtLink
    :to="notificationUrl(notification)"
    class="flex gap-3 rounded-[28px] bg-itd-block p-4 transition-colors hover:bg-itd-block-2"
    :class="!notification.isRead && 'ring-1 ring-itd-accent/30'"
    @click="emit('read', notification)"
  >
    <span class="shrink-0 pt-0.5">
      <UIcon :name="icon.name" class="size-5" :class="icon.class" />
    </span>

    <div class="flex-1 min-w-0 flex flex-col gap-1.5">
      <div class="flex items-center gap-2">
        <ItdAvatar
          v-for="actor in shownActors"
          :key="actor.id"
          :avatar="actor.avatar"
          size="xs"
        />
        <span v-if="extraActors" class="text-xs text-itd-muted">+{{ extraActors }}</span>

        <time
          :datetime="notification.createdAt"
          :title="fullDate(notification.createdAt)"
          class="ml-auto shrink-0 text-xs text-itd-muted"
        >
          {{ timeAgo(notification.createdAt) }}
        </time>
      </div>

      <p class="text-[15px] text-itd-text">
        {{ notificationText(notification) }}
      </p>

      <p v-if="notification.preview" class="line-clamp-2 text-sm text-itd-muted">
        {{ notification.preview }}
      </p>
    </div>

    <span
      v-if="!notification.isRead"
      class="mt-2 size-2 shrink-0 self-start rounded-full bg-itd-accent"
      aria-label="Не прочитано"
    />
  </NuxtLink>
</template>
