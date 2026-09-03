/** Отметить все уведомления прочитанными. */
export default defineItdHandler(async (event) => {
  const itd = await requireItd(event)

  return { marked: await itd.notifications.markAllRead() }
})
