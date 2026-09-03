/** Снять значок с профиля. */
export default defineItdHandler(async (event) => {
  const itd = await requireItd(event)

  await itd.users.removePin()
  return { status: 'ok' as const }
})
