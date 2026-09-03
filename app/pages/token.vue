<script setup lang="ts">
import type { MyProfile } from 'itd-api'

/**
 * Вход по собственному токену.
 *
 * Формы с паролем здесь нет и не будет: публичный сайт не должен принимать чужие учётные
 * данные, а капча всё равно требует локального браузера. Токен уходит одним POST и
 * оседает в серверной сессии.
 */
useHead({ title: 'Вход по токену' })
definePageMeta({ layout: 'plain' })

const { me, forgetToken } = useAuth()
const { info, fetchMode } = useMode()
const { initializeDefault: initializeDefaultPin } = usePinnedProfiles()
const itdFetch = useItdFetch()

const accessToken = ref('')
const refreshToken = ref('')
const pending = ref(false)
const error = ref('')

const isLive = computed(() => info.value?.mode === 'live')

async function submit() {
  if (pending.value || !accessToken.value.trim()) return

  pending.value = true
  error.value = ''

  try {
    me.value = await itdFetch<MyProfile>('/api/auth/session', {
      method: 'POST',
      body: {
        accessToken: accessToken.value.trim(),
        ...(refreshToken.value.trim() ? { refreshToken: refreshToken.value.trim() } : {}),
      },
    })

    // Только первая успешная авторизация заполняет ещё не созданный локальный список.
    initializeDefaultPin()

    accessToken.value = ''
    refreshToken.value = ''

    await fetchMode()
    await navigateTo('/feed')
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    pending.value = false
  }
}

async function signOut() {
  await forgetToken()
}

onMounted(() => {
  if (!info.value) fetchMode()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
    <div class="flex flex-col gap-2">
      <NuxtLink to="/" class="text-sm text-itd-muted hover:text-itd-text">
        ← На главную
      </NuxtLink>
      <h1 class="text-2xl font-semibold text-itd-text">
        Вход по токену
      </h1>
      <p class="text-itd-muted">
        Демо работает и без входа — на песочнице в памяти. Со своим access token вы увидите
        настоящую ленту, профиль и уведомления.
      </p>
    </div>

    <div v-if="isLive" class="itd-card flex flex-col gap-4">
      <p class="text-itd-text">
        Токен уже сохранён<template v-if="me">: вы вошли как
          <NuxtLink :to="`/@${me.username}`" class="text-itd-accent">@{{ me.username }}</NuxtLink></template>.
      </p>
      <p class="text-sm text-itd-muted">
        «Забыть токен» удаляет запись на сервере демо. Сессия на итд.com при этом остаётся
        действующей — токен продолжит работать где угодно ещё.
      </p>
      <div class="flex gap-3">
        <UButton to="/feed" color="neutral" class="rounded-full" label="К ленте" />
        <UButton
          color="neutral"
          variant="subtle"
          class="rounded-full"
          label="Забыть токен"
          @click="signOut"
        />
      </div>
    </div>

    <form v-else class="itd-card flex flex-col gap-4" @submit.prevent="submit">
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium text-itd-text">Access token</span>
        <input
          v-model="accessToken"
          type="password"
          autocomplete="off"
          class="itd-input"
          placeholder="eyJhbGciOi…"
        >
      </label>

      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium text-itd-text">Refresh token — необязательно</span>
        <input
          v-model="refreshToken"
          type="password"
          autocomplete="off"
          class="itd-input"
          placeholder="Без него сессия закончится вместе со сроком access token"
        >
      </label>

      <p v-if="error" class="text-sm text-red-500">
        {{ error }}
      </p>

      <UButton
        type="submit"
        color="neutral"
        size="lg"
        class="self-start rounded-full"
        :loading="pending"
        :disabled="!accessToken.trim()"
        label="Войти"
      />
    </form>

    <section class="itd-card flex flex-col gap-3 text-sm text-itd-muted">
      <h2 class="text-base font-medium text-itd-text">
        Что происходит с токеном
      </h2>
      <ul class="flex list-disc flex-col gap-2 pl-5">
        <li>Он уходит одним POST-запросом и сохраняется на сервере демо, а не в браузере.</li>
        <li>Браузер получает только cookie с идентификатором сессии — она httpOnly.</li>
        <li>Запись живёт сутки с последнего обращения; «Забыть токен» стирает её сразу.</li>
        <li>В журнале вызовов и в логах токена нет: операции авторизации туда не пишутся.</li>
      </ul>
      <p>
        Где взять токен — в
        <a
          href="https://kiowdev.github.io/itd-api/authentication/"
          target="_blank"
          rel="noopener"
          class="text-itd-accent"
        >руководстве по авторизации</a>.
      </p>
    </section>
  </div>
</template>
