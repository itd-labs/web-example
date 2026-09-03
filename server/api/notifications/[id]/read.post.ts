/** Отметить одно уведомление прочитанным. */
export default defineItdHandler(async (event) => {
  const id = requireParam(event, 'id')
  const itd = await requireItd(event)

  return { marked: await itd.notifications.markRead(id) }
})
