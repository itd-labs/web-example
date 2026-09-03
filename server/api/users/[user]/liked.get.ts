/** Понравившееся пользователю. Виден список не всем — сервер сверяется с `likesVisibility`. */
export default defineItdHandler(async (event) => {
  const user = requireParam(event, 'user')
  const query = getQuery<{ cursor?: string, limit?: string }>(event)

  const itd = await requireItd(event)

  return stripRaw(await itd.posts.likedByUser(user, {
    limit: readLimit(query.limit, 20),
    ...(query.cursor ? { cursor: query.cursor } : {}),
  }))
})
