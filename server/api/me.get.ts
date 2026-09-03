/** Свой профиль. Токен подставляет библиотека — из серверной сессии. */
export default defineItdHandler(async (event) => {
  const itd = await requireItd(event)

  return await itd.users.me()
})
