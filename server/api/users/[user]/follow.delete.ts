/** Отписаться. */
export default defineItdHandler(async (event) => {
  const user = requireParam(event, 'user')
  const itd = await requireItd(event)

  await itd.users.unfollow(user)
  return { status: 'ok' as const }
})
