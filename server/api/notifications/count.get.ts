/** Счётчик непрочитанного. При опросе именно его дёргает браузер. */
export default defineItdHandler(async (event) => {
  const itd = await requireItd(event)

  return { count: await itd.notifications.count() }
})
