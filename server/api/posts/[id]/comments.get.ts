import { CommentSort } from 'itd-api'

const KNOWN_SORTS = new Set<string>(Object.values(CommentSort))

/** Комментарии к посту. Пагинация курсорная: курсор — идентификатор последнего элемента. */
export default defineItdHandler(async (event) => {
  const id = requireParam(event, 'id')
  const query = getQuery<{ cursor?: string, limit?: string, sort?: string }>(event)
  const sort = KNOWN_SORTS.has(query.sort ?? '') ? (query.sort as CommentSort) : CommentSort.Newest

  const itd = await requireItd(event)

  return stripRaw(await itd.posts.comments(id, {
    limit: readLimit(query.limit, 20),
    sort,
    ...(query.cursor ? { cursor: query.cursor } : {}),
  }))
})
