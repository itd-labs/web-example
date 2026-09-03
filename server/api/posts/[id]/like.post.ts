/** Реакция на пост. Библиотека возвращает новый счётчик — его и показываем. */
export default defineItdHandler(async (event) => {
  const id = requireParam(event, 'id')
  const itd = await requireItd(event)

  return await itd.posts.like(id)
})
