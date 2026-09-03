export interface PinnedProfile {
  id: string
  username: string
  displayName: string
  avatar: string
  verified: boolean
  hasNuksta?: boolean
}

const STORAGE_KEY = 'itd-pinned-profiles'

const DEFAULT_PROFILE: PinnedProfile = {
  id: 'b89dee4f-2f83-4215-8dc4-a19387330c93',
  username: 'kiow',
  displayName: 'Kiow',
  avatar: '🩵',
  verified: true,
  hasNuksta: true,
}

/** Небольшой локальный список профилей для быстрых переходов. */
export function usePinnedProfiles() {
  const profiles = useState<PinnedProfile[]>('pinned-profiles', () => [])
  const loaded = useState('pinned-profiles-loaded', () => false)

  function load() {
    if (!import.meta.client || loaded.value) return
    loaded.value = true

    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
      profiles.value = Array.isArray(value)
        ? value.filter(item => item?.id && item?.username && item?.displayName)
        : []
    } catch {
      profiles.value = []
    }
  }

  function save() {
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles.value))
  }

  function normalize(profile: PinnedProfile): PinnedProfile {
    return {
      id: String(profile.id),
      username: profile.username,
      displayName: profile.displayName,
      avatar: profile.avatar,
      verified: Boolean(profile.verified),
      hasNuksta: Boolean(profile.hasNuksta),
    }
  }

  function isPinned(id: string) {
    return profiles.value.some(profile => profile.id === String(id))
  }

  function toggle(profile: PinnedProfile) {
    load()
    const id = String(profile.id)

    if (isPinned(id)) {
      profiles.value = profiles.value.filter(item => item.id !== id)
    } else {
      profiles.value = [...profiles.value, normalize(profile)]
    }

    save()
  }

  /**
   * Заполняет ещё не созданное хранилище первым профилем.
   *
   * Пустой сохранённый массив считается осознанным выбором пользователя: если он всё
   * открепил, профиль по умолчанию больше не появляется.
   */
  function initializeDefault() {
    if (!import.meta.client || localStorage.getItem(STORAGE_KEY) !== null) return

    profiles.value = [normalize(DEFAULT_PROFILE)]
    loaded.value = true
    save()
  }

  /** Освежает сохранённые имя и ник после открытия уже закреплённого профиля. */
  function sync(profile: PinnedProfile) {
    load()
    const index = profiles.value.findIndex(item => item.id === String(profile.id))
    if (index < 0) return

    profiles.value[index] = normalize(profile)
    profiles.value = [...profiles.value]
    save()
  }

  onMounted(load)

  return { profiles, isPinned, toggle, sync, initializeDefault }
}
