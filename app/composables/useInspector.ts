import type { ItdCallMeta } from '#shared/itd'

/** Строка журнала: что вызвали и что вернулось. */
export interface InspectorEntry {
  id: number
  /** Когда вызов закончился. */
  at: number
  meta: ItdCallMeta
  /** Ответ роута — он же результат вызова библиотеки. */
  response?: unknown
}

/** Сколько строк держим в журнале — вместе с ответами. */
const MAX_ENTRIES = 50

let counter = 0

/**
 * Журнал вызовов SDK для панели «под капотом».
 *
 * Живёт в памяти вкладки: сервер ничего не хранит, метаданные приезжают в конверте
 * вместе с ответом того же запроса.
 */
export function useInspector() {
  const entries = useState<InspectorEntry[]>('itd:inspector', () => [])
  const open = useState<boolean>('itd:inspector-open', () => false)
  const enabled = useRuntimeConfig().public.inspector

  /** Кладёт записи одного запроса. Ответ достаётся последнему вызову — он его и вернул. */
  function push(meta: ItdCallMeta[], response?: unknown) {
    if (!enabled || meta.length === 0) return

    const added = meta.map((item, index) => ({
      id: ++counter,
      at: Date.now(),
      meta: item,
      response: index === meta.length - 1 ? response : undefined,
    }))

    entries.value = [...added.reverse(), ...entries.value].slice(0, MAX_ENTRIES)
  }

  function clear() {
    entries.value = []
  }

  function toggle() {
    open.value = !open.value
    if (import.meta.client) {
      try {
        localStorage.setItem('itd:inspector-open', open.value ? '1' : '0')
      } catch {
        // Приватный режим или запрет на хранилище — панель просто не запомнит состояние.
      }
    }
  }

  /** Восстанавливает состояние панели после перезагрузки страницы. */
  function restore() {
    try {
      open.value = localStorage.getItem('itd:inspector-open') === '1'
    } catch {
      open.value = false
    }
  }

  return { entries, open, enabled, push, clear, toggle, restore }
}
