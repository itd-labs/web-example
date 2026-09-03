/** Что сервер рассказывает о текущем режиме работы. */
export interface ModeInfo {
  mode: 'live' | 'sandbox'
  sandboxEnabled: boolean
  inspector: boolean
  realtime: string
  library: string
}

/**
 * Режим посетителя: живой аккаунт или песочница.
 *
 * От него зависит баннер над лентой и то, какие действия вообще предлагать: вложения,
 * например, песочница не поддерживает.
 */
export function useMode() {
  const info = useState<ModeInfo | null>('itd:mode', () => null)
  const request = useRequestFetch()

  async function fetchMode() {
    try {
      info.value = await request<ModeInfo>('/api/mode')
    } catch {
      info.value = null
    }
    return info.value
  }

  const isSandbox = computed(() => info.value?.mode === 'sandbox')
  const isLive = computed(() => info.value?.mode === 'live')

  return { info, fetchMode, isSandbox, isLive }
}
