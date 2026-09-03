/**
 * Стена пользователя.
 *
 * Это не только его собственные записи: сюда попадает и то, что на стене оставили
 * другие. Закреплённый пост сервер поднимает наверх сам, если передать `pinnedPostId`.
 */
export default defineItdHandler(async (event) => {
  const user = requireParam(event, 'user')
  const query = getQuery<{ cursor?: string, limit?: string, pinnedPostId?: string }>(event)

  const itd = await requireItd(event)

  return stripRaw(await itd.posts.byUser(user, {
    limit: readLimit(query.limit, 20),
    ...(query.cursor ? { cursor: query.cursor } : {}),
    ...(query.pinnedPostId ? { pinnedPostId: query.pinnedPostId } : {}),
  }))
})
