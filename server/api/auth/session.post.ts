/**
 * Вход по собственному токену.
 *
 * Пароль сюда не приходит и прийти не может: формы входа в примере нет вовсе. Посетитель
 * приносит готовый access token (и, если есть, refresh), а сервер проверяет его одним
 * вызовом `users.me()` и складывает сессию у себя. Наружу токен больше не показывается —
 * браузер получает только профиль и cookie с идентификатором.
 */
export default defineItdHandler(async (event) => {
  const body = await readBody<{ accessToken?: string, refreshToken?: string }>(event)

  const accessToken = body?.accessToken?.trim()
  const refreshToken = body?.refreshToken?.trim()

  if (!accessToken) {
    throw createError({
      statusCode: 422,
      statusMessage: 'MISSING_TOKEN',
      data: { code: 'MISSING_TOKEN', message: 'Укажите access token' },
    })
  }

  // Прежняя сессия могла остаться от другого аккаунта — начинаем с чистой.
  const previous = await dropSession(event)
  if (previous) await forgetAccount(previous)

  const probe = probeClient(event, {
    accessToken,
    ...(refreshToken ? { refreshToken } : {}),
  })

  try {
    const me = await probe.itd.users.me()

    // Библиотека успела дописать в сессию deviceId и cookie продления — сохраняем целиком.
    await adoptSession(event, probe.session() ?? { accessToken, refreshToken })

    return me
  } finally {
    await probe.itd.dispose().catch(() => {})
  }
})
