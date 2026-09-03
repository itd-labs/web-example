/**
 * Ответы на комментарий.
 *
 * Пагинация здесь постраничная, а не курсорная, — отличие от комментариев к посту.
 * Наружу это не протекает: `useCursorList` принимает страницу любой схемы.
 */
export default defineItdHandler(async (event) => {
  const id = requireParam(event, 'id')
  const query = getQuery<{ page?: string, limit?: string }>(event)
  const page = Math.max(1, Number(query.page) || 1)

  const itd = await requireItd(event)

  return stripRaw(await itd.comments.replies(id, { limit: readLimit(query.limit, 20), page }))
})
