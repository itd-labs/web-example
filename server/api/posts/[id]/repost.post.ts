/** Репост. Необязательный комментарий уходит вместе с ним. */
export default defineItdHandler(async (event) => {
  const id = requireParam(event, 'id')
  const body = await readBody<{ content?: string }>(event).catch(() => null)

  const { itd, mode, sid } = await useItd(event)
  if (mode === 'sandbox') assertQuota(sid, body?.content)

  return await itd.posts.repost(id, body?.content?.trim() ?? '')
})
