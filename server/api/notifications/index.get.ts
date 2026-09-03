import { CacheModes } from '@itd-api/cache'
import { mapPage } from 'itd-api'

/**
 * Список уведомлений. Пагинация по смещению — библиотека отдаёт честное `nextOffset`.
 *
 * `?fresh=1` просит кэш перечитать ответ: этим пользуется опрос, заметивший рост
 * счётчика, — иначе он получил бы список из кэша, ещё без нового уведомления.
 */
export default defineItdHandler(async (event) => {
  const query = getQuery<{ offset?: string, limit?: string, fresh?: string }>(event)
  const offset = Math.max(0, Number(query.offset) || 0)

  const itd = await requireItd(event)
  const page = await itd.notifications.list(
    { limit: readLimit(query.limit, 20), offset },
    query.fresh === '1' ? { extensions: { cache: CacheModes.Reload } } : {},
  )

  // У каждого уведомления своя копия исходного ответа — в браузер она не едет.
  return stripRaw(mapPage(page, withoutRaw))
})
