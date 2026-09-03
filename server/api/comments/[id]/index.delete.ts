/** Удалить комментарий. Проверку прав выполняет API итд.com. */
export default defineItdHandler(async (event) => {
  const id = requireParam(event, 'id')
  const itd = await requireItd(event)

  await itd.comments.remove(id)
  return { status: 'ok' as const }
})
