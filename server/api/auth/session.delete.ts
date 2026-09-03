/**
 * Выход: стирает токены посетителя.
 *
 * Запись в хранилище удаляется сразу, клиент выгружается из памяти, cookie сбрасывается.
 * Следующий заход начнётся с чистой песочницы.
 */
export default defineItdHandler(async (event) => {
  const sid = await dropSession(event)
  if (sid) await forgetAccount(sid)

  return { status: 'ok' as const }
})
