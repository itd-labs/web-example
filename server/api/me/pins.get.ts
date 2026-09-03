/** Значки профиля. */
export default defineItdHandler(async (event) => {
  const itd = await requireItd(event)

  return await itd.users.pins()
})
