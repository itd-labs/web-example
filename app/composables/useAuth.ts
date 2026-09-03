import type { MyProfile } from 'itd-api'

/**
 * Профиль текущего посетителя.
 *
 * `undefined` — ещё не спрашивали, `null` — профиль недоступен. В песочнице он тоже есть:
 * там посетитель ходит от лица демо-пользователя.
 */
export function useAuth() {
  const me = useState<MyProfile | null | undefined>('itd:me', () => undefined)
  const itdFetch = useItdFetch()
  const { fetchMode } = useMode()

  async function fetchMe() {
    try {
      me.value = await itdFetch<MyProfile>('/api/me')
    } catch {
      me.value = null
    }
    return me.value
  }

  /**
   * Забывает токен.
   *
   * Сессию на самом итд.com это не закрывает — токен остаётся действительным, просто
   * демо перестаёт его хранить. Посетитель возвращается в песочницу, поэтому профиль и
   * режим перечитываются: без этого интерфейс на мгновение показал бы вход без данных.
   */
  async function forgetToken() {
    try {
      await itdFetch('/api/auth/session', { method: 'DELETE' })
    } finally {
      await fetchMode()
      await fetchMe()
    }
  }

  /** Путь к своему профилю. */
  const profilePath = computed(() => (me.value ? `/@${me.value.username}` : '/token'))

  return { me, fetchMe, forgetToken, profilePath }
}
