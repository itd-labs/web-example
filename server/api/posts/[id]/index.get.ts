/** Отдельный пост вместе с топовыми комментариями. */
export default defineItdHandler(async (event) => {
  const id = requireParam(event, 'id')
  const itd = await requireItd(event)

  return await itd.posts.get(id)
})
