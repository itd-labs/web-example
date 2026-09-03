/** Подписки. Такое же ограничение в двадцать записей, что и у подписчиков. */
export default defineItdHandler(async (event) => {
  const user = requireParam(event, 'user')
  const itd = await requireItd(event)

  return stripRaw(await itd.users.following(user, { limit: 20 }))
})
