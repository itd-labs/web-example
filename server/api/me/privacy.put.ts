import { AccessType } from 'itd-api'
import type { PrivacySettings } from 'itd-api'

// wallAccess и likesVisibility берут значения из одного перечня, поэтому список общий.
const KNOWN_ACCESS = new Set<string>(Object.values(AccessType))

/** Правка настроек приватности. Отправляются только переданные поля. */
export default defineItdHandler(async (event) => {
  const body = await readBody<Partial<PrivacySettings>>(event)

  const input: Partial<PrivacySettings> = {}

  if (typeof body?.isPrivate === 'boolean') input.isPrivate = body.isPrivate
  if (typeof body?.showLastSeen === 'boolean') input.showLastSeen = body.showLastSeen
  if (typeof body?.wallAccess === 'string' && KNOWN_ACCESS.has(body.wallAccess)) {
    input.wallAccess = body.wallAccess
  }
  if (typeof body?.likesVisibility === 'string' && KNOWN_ACCESS.has(body.likesVisibility)) {
    input.likesVisibility = body.likesVisibility
  }

  if (Object.keys(input).length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'NOTHING_TO_UPDATE',
      data: { code: 'NOTHING_TO_UPDATE', message: 'Нечего сохранять' },
    })
  }

  const itd = await requireItd(event)

  return await itd.users.updatePrivacy(input)
})
