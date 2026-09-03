/** Страницы, которые открываются без всякой сессии. */
const PUBLIC_ROUTES = new Set(['/', '/token', '/about'])

/**
 * Пускает в приложение.
 *
 * Профиль есть у обоих режимов: со своим токеном это настоящий аккаунт, без него —
 * демо-пользователь песочницы. Если не вышло ни то, ни другое, остаётся страница входа.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { me, fetchMe } = useAuth()
  const { info, fetchMode } = useMode()

  if (!info.value) await fetchMode()
  if (me.value === undefined) await fetchMe()

  if (!me.value && !PUBLIC_ROUTES.has(to.path)) return navigateTo('/token')
})
