/** Посты по хэштегу. */
export default defineItdHandler(async (event) => {
  const tag = requireParam(event, 'tag')
  const query = getQuery<{ cursor?: string, limit?: string }>(event)

  const itd = await requireItd(event)

  return stripRaw(await itd.hashtags.posts(tag, {
    limit: readLimit(query.limit, 20),
    ...(query.cursor ? { cursor: query.cursor } : {}),
  }))
})
