import type { Page } from 'itd-api'
import type { ItdPage } from '#shared/itd'

/**
 * Готовит страницу к отправке в браузер.
 *
 * Библиотека кладёт в `raw` копию исходного ответа сервера — она полезна, когда
 * документация разошлась с реальностью, но браузеру не нужна: с ней лента из двадцати
 * постов уехала бы вдвое тяжелее. Всё остальное уходит как есть.
 */
export function stripRaw<T>(page: Page<T>): ItdPage<T> {
  const { raw: _raw, ...rest } = page
  return rest
}

/**
 * То же для отдельной модели: снимает копию исходного ответа.
 *
 * Нужно уведомлениям — у них `raw` лежит в каждом элементе списка:
 * `stripRaw(mapPage(page, withoutRaw))`.
 */
export function withoutRaw<T extends { raw: unknown }>(value: T): Omit<T, 'raw'> {
  const { raw: _raw, ...rest } = value
  return rest
}
