import type { Ref } from 'vue'
import type { ItdPage } from '#shared/itd'

/**
 * Позиция следующей страницы, какой бы схемы пагинации ни держался сервер.
 *
 * У ленты это непрозрачный курсор, у уведомлений — смещение, у ответов на комментарий —
 * номер страницы. Библиотека приводит все три к одному `Page`, поэтому разбирать схему
 * приходится ровно здесь, в одном месте.
 */
export function nextPosition<T>(page: ItdPage<T>): string | number | null {
  if (!page.hasMore) return null
  if (page.nextCursor != null) return page.nextCursor
  if (page.nextOffset != null) return page.nextOffset
  if (page.page != null) return page.page + 1
  return null
}

/** Что должен вернуть загрузчик страницы: элементы и позиция следующей. */
export interface LoadedPage<T, C> {
  items: T[]
  next: C | null
}

/** Состояние бесконечного списка. */
export interface CursorList<T> {
  items: Ref<T[]>
  /** Идёт первая загрузка или перезагрузка после смены источника. */
  pending: Ref<boolean>
  /** Подгружается продолжение. */
  loadingMore: Ref<boolean>
  error: Ref<string | null>
  hasMore: Ref<boolean>
  /** Загружает первую страницу, отбрасывая всё загруженное раньше. */
  reload: () => Promise<void>
  /** Догружает следующую страницу, если она есть. */
  loadMore: () => Promise<void>
  /** Заменяет элемент по идентификатору — для оптимистичных обновлений. */
  patch: (id: string, update: (item: T) => T) => void
  /** Добавляет элемент в начало списка. */
  prepend: (item: T) => void
  /** Убирает элемент из списка. */
  remove: (id: string) => void
}

/**
 * Бесконечный список, который сам следит за позицией следующей страницы.
 *
 * Позиция непрозрачна: курсор ленты, номер страницы ответов или смещение уведомлений —
 * загрузчик получает ровно то, что вернул в прошлый раз.
 *
 * @param load загрузчик страницы; `null` в аргументе означает начало списка
 * @param key элементы списка различаются по нему при точечных обновлениях
 */
export function useCursorList<T, C = string | number>(
  load: (next: C | null) => Promise<LoadedPage<T, C>>,
  key: (item: T) => string,
): CursorList<T> {
  const items = ref<T[]>([]) as Ref<T[]>
  const pending = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)
  const hasMore = ref(true)
  const next = ref<C | null>(null) as Ref<C | null>

  /** Номер попытки: ответ устаревшего запроса не должен затирать свежий список. */
  let generation = 0

  async function reload() {
    const current = ++generation

    pending.value = true
    error.value = null
    next.value = null

    try {
      const page = await load(null)
      if (current !== generation) return

      items.value = page.items
      next.value = page.next
      hasMore.value = page.next !== null
    } catch (cause) {
      if (current !== generation) return
      error.value = apiErrorMessage(cause)
      items.value = []
      hasMore.value = false
    } finally {
      if (current === generation) pending.value = false
    }
  }

  async function loadMore() {
    if (pending.value || loadingMore.value || !hasMore.value) return

    const current = generation
    loadingMore.value = true

    try {
      const page = await load(next.value)
      if (current !== generation) return

      const known = new Set(items.value.map(key))
      items.value = [...items.value, ...page.items.filter(item => !known.has(key(item)))]
      next.value = page.next
      hasMore.value = page.next !== null
    } catch (cause) {
      if (current !== generation) return
      error.value = apiErrorMessage(cause)
      hasMore.value = false
    } finally {
      if (current === generation) loadingMore.value = false
    }
  }

  function patch(id: string, update: (item: T) => T) {
    items.value = items.value.map(item => (key(item) === id ? update(item) : item))
  }

  function prepend(item: T) {
    items.value = [item, ...items.value]
  }

  function remove(id: string) {
    items.value = items.value.filter(item => key(item) !== id)
  }

  return { items, pending, loadingMore, error, hasMore, reload, loadMore, patch, prepend, remove }
}
