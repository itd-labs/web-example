import { createMockServer } from '@itd-api/testing'
import { FeedTab, ItdClient } from 'itd-api'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_USER, sandboxSeed } from '../server/fixtures/seed'

/**
 * Песочница: сервер API в памяти с состоянием.
 *
 * Проверяется то, на что опирается демо без токена, — что данные есть и что запись
 * действительно меняет состояние, а не притворяется.
 */
describe('песочница', () => {
  let server: ReturnType<typeof createMockServer>
  let itd: ItdClient

  beforeEach(() => {
    server = createMockServer({ seed: sandboxSeed() })
    itd = new ItdClient(server.clientOptions({ as: DEMO_USER }))
  })

  it('отдаёт ленту из фикстур', async () => {
    const page = await itd.posts.list({ tab: FeedTab.Popular, limit: 20 })

    expect(page.items.length).toBeGreaterThan(0)
    expect(page.items[0]?.author.username).toBeTruthy()
  })

  it('узнаёт демо-пользователя', async () => {
    const me = await itd.users.me()

    expect(me.username).toBe(DEMO_USER)
  })

  it('запоминает реакцию', async () => {
    const page = await itd.posts.list({ tab: FeedTab.Popular, limit: 5 })
    const post = page.items.find(item => !item.isLiked)
    expect(post).toBeDefined()

    const result = await itd.posts.like(post!.id)
    expect(result.liked).toBe(true)

    const updated = await itd.posts.get(post!.id)
    expect(updated.isLiked).toBe(true)
    expect(updated.likesCount).toBe(result.likesCount)
  })

  it('публикует пост и показывает его в профиле', async () => {
    const before = server.snapshot().posts.length

    const created = await itd.posts.create({ content: 'Проверка песочницы' })

    expect(created.content).toBe('Проверка песочницы')
    expect(server.snapshot().posts.length).toBe(before + 1)
  })

  it('держит состояние посетителей раздельно', async () => {
    const other = createMockServer({ seed: sandboxSeed() })
    const otherItd = new ItdClient(other.clientOptions({ as: DEMO_USER }))

    await itd.posts.create({ content: 'Видно только в первой песочнице' })

    const foreign = await otherItd.posts.list({ tab: FeedTab.Popular, limit: 20 })
    expect(foreign.items.some(post => post.content === 'Видно только в первой песочнице')).toBe(false)
  })
})
