/** Новый комментарий к посту. */
export default defineItdHandler(async (event) => {
  const id = requireParam(event, 'id')
  const body = await readBody<{ content?: string, attachmentIds?: unknown }>(event)

  const content = body?.content?.trim() ?? ''
  const attachmentIds = readAttachmentIds(body?.attachmentIds)

  if (!content && attachmentIds.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'EMPTY_COMMENT',
      data: { code: 'EMPTY_COMMENT', message: 'Комментарий не может быть пустым' },
    })
  }

  const { itd, mode, sandbox } = await useItd(event)
  if (mode === 'sandbox' && sandbox) assertQuota(sandbox, content)

  return await itd.posts.comment(id, { content, attachmentIds })
})
