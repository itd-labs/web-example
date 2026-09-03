/** Поиск людей. Пустой запрос до API не доходит. */
export default defineItdHandler(async (event) => {
  const query = getQuery<{ q?: string }>(event)
  const term = query.q?.trim() ?? ''

  if (!term) return { users: [], hashtags: [] }

  const itd = await requireItd(event)

  return await itd.search.all(term)
})
