<script setup lang="ts">
import { AccessType, type MyProfile, type PinsResult, type PrivacySettings } from 'itd-api'
import type { UploadedAttachment } from '#shared/itd'

const itdFetch = useItdFetch()

/**
 * Настройки профиля — та же модалка, что открывается кнопкой «Редактировать» на итд.com.
 *
 * Разделы повторяют оригинал; работают те, что покрыты API: «Аккаунт» и «Приватность».
 */
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [profile: MyProfile] }>()

const { me, fetchMe } = useAuth()

const SECTIONS = [
  { key: 'account', label: 'Аккаунт', icon: 'i-lucide-user' },
  { key: 'privacy', label: 'Приватность', icon: 'i-lucide-lock' },
] as const

const section = ref<'account' | 'privacy'>('account')

const form = reactive({ displayName: '', username: '', bio: '', banner: '' })

const saving = ref(false)
const error = ref('')
const saved = ref(false)

const pins = ref<PinsResult>({ pins: [], activePin: null })
const pinBusy = ref(false)

const privacy = ref<PrivacySettings | null>(null)
const privacyBusy = ref(false)

const bannerInput = ref<HTMLInputElement>()
const bannerUploading = ref(false)

// Один и тот же перечень для стены и для видимости реакций.
const ACCESS_OPTIONS = [
  { value: AccessType.Everyone, label: 'Все' },
  { value: AccessType.Followers, label: 'Подписчики' },
  { value: AccessType.Mutual, label: 'Взаимные подписки' },
  { value: AccessType.Nobody, label: 'Никто' },
] as const

/** Заполняет форму текущим профилем — при каждом открытии, чтобы не хранить черновик. */
function fill(profile: MyProfile) {
  form.displayName = profileName(profile)
  form.username = profile.username
  form.bio = profileBio(profile)
  form.banner = profile.banner ?? ''
}

async function load() {
  error.value = ''
  saved.value = false

  if (me.value) fill(me.value)

  const [pinsResult, privacyResult] = await Promise.allSettled([
    itdFetch<PinsResult>('/api/me/pins'),
    itdFetch<PrivacySettings>('/api/me/privacy'),
  ])

  if (pinsResult.status === 'fulfilled') pins.value = pinsResult.value
  if (privacyResult.status === 'fulfilled') privacy.value = privacyResult.value
}

watch(open, (value) => {
  if (value) load()
})

async function save() {
  if (saving.value || !me.value) return

  saving.value = true
  error.value = ''
  saved.value = false

  // Отправляем только изменённое: сервер отвергает запрос без полей, а лишние
  // поля пришлось бы прогонять через проверку имени пользователя каждый раз.
  const body: Record<string, unknown> = {}
  if (form.displayName !== profileName(me.value)) body.displayName = form.displayName
  if (form.username !== me.value.username) body.username = form.username
  if (form.bio !== profileBio(me.value)) body.bio = form.bio
  if (form.banner !== (me.value.banner ?? '')) body.banner = form.banner

  if (Object.keys(body).length === 0) {
    saving.value = false
    saved.value = true
    return
  }

  try {
    const updated = await itdFetch<MyProfile>('/api/me', { method: 'PUT', body })
    me.value = updated
    fill(updated)
    saved.value = true
    emit('saved', updated)
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    saving.value = false
  }
}

async function selectPin(slug: string | null) {
  if (pinBusy.value) return

  pinBusy.value = true
  error.value = ''

  try {
    if (slug) await itdFetch('/api/me/pin', { method: 'PUT', body: { slug } })
    else await itdFetch('/api/me/pin', { method: 'DELETE' })

    pins.value = { ...pins.value, activePin: slug }
    const refreshed = await fetchMe()
    if (refreshed) emit('saved', refreshed)
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    pinBusy.value = false
  }
}

async function updatePrivacy(patch: Partial<PrivacySettings>) {
  if (privacyBusy.value || !privacy.value) return

  const before = privacy.value
  privacyBusy.value = true
  error.value = ''
  privacy.value = { ...before, ...patch }

  try {
    privacy.value = await itdFetch<PrivacySettings>('/api/me/privacy', {
      method: 'PUT',
      body: patch,
    })
  } catch (cause) {
    privacy.value = before
    error.value = apiErrorMessage(cause)
  } finally {
    privacyBusy.value = false
  }
}

/** Баннер — обычный URL, поэтому картинка сперва уезжает в хранилище файлов. */
async function uploadBanner(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  const body = new FormData()
  body.append('file', file, file.name)

  bannerUploading.value = true
  error.value = ''

  try {
    const uploaded = await itdFetch<UploadedAttachment>('/api/upload', { method: 'POST', body })
    form.banner = uploaded.url
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    bannerUploading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-3xl' }">
    <template #content>
      <div class="flex max-h-[85vh] flex-col overflow-hidden bg-itd-block sm:flex-row">
        <!-- Ниже sm разделы стоят строкой сверху, и закрывать модалку логично из шапки:
             рядом с заголовком раздела крестик выглядел случайной кнопкой. На широком
             экране шапки нет — там заголовок и крестик стоят над самим разделом. -->
        <header
          class="flex shrink-0 items-center justify-between gap-3 border-b border-itd-border px-4 py-3 sm:hidden"
        >
          <h2 class="text-lg font-semibold text-itd-text">
            Настройки
          </h2>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-x"
            aria-label="Закрыть"
            @click="open = false"
          />
        </header>

        <nav
          class="flex shrink-0 gap-1 overflow-x-auto border-b border-itd-border p-4 sm:w-52 sm:flex-col sm:border-b-0 sm:border-r"
        >
          <p class="mb-2 hidden px-3 text-lg font-semibold text-itd-text sm:block">
            Настройки
          </p>
          <button
            v-for="item in SECTIONS"
            :key="item.key"
            type="button"
            class="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer"
            :class="
              item.key === section
                ? 'bg-itd-block-2 text-itd-text'
                : 'text-itd-muted hover:text-itd-text'
            "
            @click="section = item.key"
          >
            <UIcon :name="item.icon" class="size-4" />
            <span>{{ item.label }}</span>
          </button>
        </nav>

        <div class="flex-1 overflow-y-auto p-6">
          <div class="mb-4 flex items-start justify-between gap-4">
            <h2 class="text-xl font-semibold text-itd-text">
              {{ SECTIONS.find(item => item.key === section)?.label }}
            </h2>
            <UButton
              class="hidden sm:inline-flex"
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              aria-label="Закрыть"
              @click="open = false"
            />
          </div>

          <p v-if="error" class="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {{ error }}
          </p>

          <template v-if="section === 'account' && me">
            <div class="flex flex-col gap-5">
              <div class="flex items-center justify-between gap-4">
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-itd-text">Эмоджи-клан</span>
                  <span class="text-xs text-itd-muted">
                    Выбран при регистрации. Изменить нельзя
                  </span>
                </div>
                <span class="text-3xl leading-none select-none">{{ me.avatar }}</span>
              </div>

              <label class="flex flex-col gap-2">
                <span class="text-sm font-medium text-itd-text">Имя</span>
                <span class="text-xs text-itd-muted">Ваше отображаемое имя</span>
                <input v-model="form.displayName" maxlength="50" class="itd-input">
              </label>

              <label class="flex flex-col gap-2">
                <span class="text-sm font-medium text-itd-text">Username</span>
                <span class="text-xs text-itd-muted">
                  Уникальный идентификатор: латиница, цифры и _
                </span>
                <input v-model="form.username" maxlength="30" class="itd-input">
              </label>

              <label class="flex flex-col gap-2">
                <span class="text-sm font-medium text-itd-text">О себе</span>
                <textarea
                  v-model="form.bio"
                  rows="3"
                  maxlength="300"
                  placeholder="Напиши что-нибудь о себе..."
                  class="itd-input resize-none"
                />
              </label>

              <div class="flex flex-col gap-2">
                <span class="text-sm font-medium text-itd-text">Баннер</span>
                <div
                  class="relative h-28 overflow-hidden rounded-2xl bg-itd-block-2"
                >
                  <img v-if="form.banner" :src="form.banner" alt="" class="size-full object-cover">
                  <div
                    v-if="bannerUploading"
                    class="absolute inset-0 flex items-center justify-center bg-black/40"
                  >
                    <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-white" />
                  </div>
                </div>
                <input
                  ref="bannerInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="uploadBanner"
                >
                <div class="flex gap-2">
                  <UButton
                    color="neutral"
                    variant="subtle"
                    size="sm"
                    icon="i-lucide-upload"
                    label="Загрузить"
                    :loading="bannerUploading"
                    @click="bannerInput?.click()"
                  />
                  <UButton
                    v-if="form.banner"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    icon="i-lucide-trash-2"
                    label="Убрать"
                    @click="form.banner = ''"
                  />
                </div>
              </div>

              <div v-if="pins.pins.length" class="flex flex-col gap-2">
                <span class="text-sm font-medium text-itd-text">Пин</span>
                <span class="text-xs text-itd-muted">Отображается рядом с именем</span>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="pin in pins.pins"
                    :key="pin.slug"
                    type="button"
                    :title="pin.description"
                    :disabled="pinBusy"
                    class="flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer disabled:opacity-50"
                    :class="
                      pin.slug === pins.activePin
                        ? 'border-itd-accent bg-itd-accent/5'
                        : 'border-itd-border hover:bg-itd-hover'
                    "
                    @click="selectPin(pin.slug === pins.activePin ? null : pin.slug)"
                  >
                    <img :src="pin.url" :alt="pin.name" class="size-6 object-contain">
                    <span class="max-w-40 truncate text-xs text-itd-text">{{ pin.name }}</span>
                  </button>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <UButton
                  color="neutral"
                  size="lg"
                  class="rounded-full"
                  :loading="saving"
                  label="Сохранить"
                  @click="save"
                />
                <span v-if="saved" class="flex items-center gap-1.5 text-sm text-itd-repost">
                  <UIcon name="i-lucide-check" class="size-4" />
                  Сохранено
                </span>
              </div>
            </div>
          </template>

          <template v-else-if="section === 'privacy'">
            <div v-if="!privacy" class="flex flex-col gap-3">
              <span class="itd-skeleton h-12 w-full rounded-xl" />
              <span class="itd-skeleton h-12 w-full rounded-xl" />
            </div>

            <div v-else class="flex flex-col gap-5">
              <label class="flex items-center justify-between gap-4">
                <span class="flex flex-col">
                  <span class="text-sm font-medium text-itd-text">Закрытый профиль</span>
                </span>
                <USwitch
                  :model-value="privacy.isPrivate"
                  :disabled="privacyBusy"
                  @update:model-value="updatePrivacy({ isPrivate: $event })"
                />
              </label>

              <label class="flex items-center justify-between gap-4">
                <span class="flex flex-col">
                  <span class="text-sm font-medium text-itd-text">Показывать время визита</span>
                  <span class="text-xs text-itd-muted">Когда вы были в сети</span>
                </span>
                <USwitch
                  :model-value="privacy.showLastSeen"
                  :disabled="privacyBusy"
                  @update:model-value="updatePrivacy({ showLastSeen: $event })"
                />
              </label>

              <label class="flex flex-col gap-2">
                <span class="text-sm font-medium text-itd-text">Кто может писать на стену</span>
                <select
                  :value="privacy.wallAccess"
                  :disabled="privacyBusy"
                  class="itd-input"
                  @change="updatePrivacy({ wallAccess: ($event.target as HTMLSelectElement).value })"
                >
                  <option v-for="option in ACCESS_OPTIONS" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label class="flex flex-col gap-2">
                <span class="text-sm font-medium text-itd-text">Кто видит реакции</span>
                <select
                  :value="privacy.likesVisibility"
                  :disabled="privacyBusy"
                  class="itd-input"
                  @change="
                    updatePrivacy({ likesVisibility: ($event.target as HTMLSelectElement).value })
                  "
                >
                  <option v-for="option in ACCESS_OPTIONS" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
            </div>
          </template>
        </div>
      </div>
    </template>
  </UModal>
</template>
