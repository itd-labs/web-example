/** Выбор активного значка профиля. */
export default defineItdHandler(async (event) => {
  const body = await readBody<{ slug?: string }>(event)
  const slug = body?.slug?.trim()

  if (!slug) {
    throw createError({
      statusCode: 422,
      statusMessage: 'MISSING_SLUG',
      data: { code: 'MISSING_SLUG', message: 'Не указан значок' },
    })
  }

  const itd = await requireItd(event)

  await itd.users.setPin(slug)
  return { status: 'ok' as const }
})
