/**
 * Правка своего профиля.
 *
 * Отправляются только переданные поля. Аватар менять нельзя: эмодзи-клан выбирается при
 * регистрации. Шифровать имя и описание пример тоже не умеет — намеренно: скрытый текст
 * он показывает, но не создаёт.
 */
export default defineItdHandler(async (event) => {
  const body = await readBody<{
    displayName?: string
    username?: string
    bio?: string
    banner?: string | null
  }>(event)

  const input: Record<string, string> = {}

  if (typeof body?.displayName === 'string') input.displayName = body.displayName.trim()
  if (typeof body?.username === 'string') input.username = body.username.trim()
  if (typeof body?.bio === 'string') input.bio = body.bio
  if (typeof body?.banner === 'string') input.banner = body.banner.trim()

  if (Object.keys(input).length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'NOTHING_TO_UPDATE',
      data: { code: 'NOTHING_TO_UPDATE', message: 'Нечего сохранять' },
    })
  }

  const itd = await requireItd(event)

  return await itd.users.updateMe(input)
})
