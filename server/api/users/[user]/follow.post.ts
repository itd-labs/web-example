/** Подписаться. У закрытого профиля это заявка — статус приходит в ответе. */
export default defineItdHandler(async (event) => {
  const user = requireParam(event, 'user')
  const itd = await requireItd(event)

  return await itd.users.follow(user)
})
