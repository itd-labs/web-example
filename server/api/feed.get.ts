import { FeedTab } from 'itd-api'

const KNOWN_TABS = new Set<string>(Object.values(FeedTab))

/**
 * Лента: «Для вас» (`popular`), «Лента кланов» (`clan`) и «Подписки» (`following`).
 *
 * Курсор непрозрачен и у каждой вкладки свой, поэтому он передаётся обратно как есть.
 */
export default defineItdHandler(async (event) => {
  const query = getQuery<{ tab?: string, cursor?: string, limit?: string }>(event)
  const tab = KNOWN_TABS.has(query.tab ?? '') ? (query.tab as FeedTab) : FeedTab.Popular

  const itd = await requireItd(event)

  return stripRaw(await itd.posts.list({
    tab,
    limit: readLimit(query.limit, 20),
    ...(query.cursor ? { cursor: query.cursor } : {}),
  }))
})
