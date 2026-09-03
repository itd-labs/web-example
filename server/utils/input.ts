/** Читает список идентификаторов вложений из тела запроса. */
export function readAttachmentIds(input: unknown): string[] {
  return Array.isArray(input) ? input.filter(value => typeof value === 'string') : []
}
