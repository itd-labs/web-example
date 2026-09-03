/**
 * Подписчики.
 *
 * Сервер отдаёт только первые 20 записей и `page` игнорирует, поэтому листать нечего:
 * `hasMore` всегда `false`. Ограничение платформы, а не библиотеки.
 */
export default defineItdHandler(async (event) => {
  const user = requireParam(event, 'user')
  const itd = await requireItd(event)

  return stripRaw(await itd.users.followers(user, { limit: 20 }))
})
