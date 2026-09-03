/** Чужой профиль. Принимает и UUID, и имя пользователя. */
export default defineItdHandler(async (event) => {
  const user = requireParam(event, 'user')
  const itd = await requireItd(event)

  return await itd.users.get(user)
})
