/** Отменить репост. Библиотека ничего не возвращает — отвечаем признаком успеха. */
export default defineItdHandler(async (event) => {
  const id = requireParam(event, 'id')
  const itd = await requireItd(event)

  await itd.posts.unrepost(id)
  return { status: 'ok' as const }
})
