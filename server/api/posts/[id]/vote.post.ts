/** Голос в опросе. Несколько вариантов допустимы только при multipleChoice. */
export default defineItdHandler(async (event) => {
  const id = requireParam(event, 'id')
  const body = await readBody<{ optionIds?: string[] }>(event)
  const optionIds = body?.optionIds?.filter(value => typeof value === 'string') ?? []

  if (optionIds.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'NO_OPTIONS',
      data: { code: 'NO_OPTIONS', message: 'Не выбран ни один вариант' },
    })
  }

  const itd = await requireItd(event)

  return await itd.posts.vote(id, optionIds)
})
