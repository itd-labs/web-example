/** Реакция на комментарий. */
export default defineItdHandler(async (event) => {
  const id = requireParam(event, 'id')
  const itd = await requireItd(event)

  return await itd.comments.like(id)
})
