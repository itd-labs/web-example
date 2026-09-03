/** Снять реакцию с поста. */
export default defineItdHandler(async (event) => {
  const id = requireParam(event, 'id')
  const itd = await requireItd(event)

  return await itd.posts.unlike(id)
})
