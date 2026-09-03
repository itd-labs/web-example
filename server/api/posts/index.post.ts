import type { Span } from 'itd-api'

/** Публикация поста: текст, вложения и обычные либо crypto-spans. */
export default defineItdHandler(async (event) => {
  const body = await readBody<{
    content?: string
    wallRecipientId?: string
    attachmentIds?: unknown
    spans?: Span[]
  }>(event)

  const content = typeof body?.content === 'string' ? body.content : ''
  const attachmentIds = readAttachmentIds(body?.attachmentIds)
  const spans = Array.isArray(body?.spans) ? body.spans : []

  if (!content.trim() && attachmentIds.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'EMPTY_POST',
      data: { code: 'EMPTY_POST', message: 'Пост не может быть пустым' },
    })
  }

  const { itd, mode, sid } = await useItd(event)
  if (mode === 'sandbox') assertQuota(sid, content)

  const created = await itd.posts.create({
    content,
    ...(spans.length > 0 ? { spans } : {}),
    ...(attachmentIds.length > 0 ? { attachmentIds } : {}),
    ...(body.wallRecipientId ? { wallRecipientId: body.wallRecipientId } : {}),
  })

  if (mode !== 'sandbox') return created

  // Единственное место, где роут делает больше одного вызова: в песочнице посетитель
  // один, и запись без единой реакции выглядит уныло. Жители отвечают на неё сами,
  // после чего пост перечитывается — счётчики к этому моменту уже другие. Журнал
  // вызовов показывает всю цепочку, а тело ответа принадлежит последнему вызову.
  await livenPost(sid, created.id)

  return await itd.posts.get(created.id)
})
