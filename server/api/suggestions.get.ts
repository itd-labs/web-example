/** Кого почитать: подсказки для правой колонки. */
export default defineItdHandler(async (event) => {
  const itd = await requireItd(event)

  return { users: await itd.users.whoToFollow() }
})
