import { cache } from '@itd-api/cache'
import { apiErrorResponse, apiResponse, createMockFetch, createMockServer, userFixture } from '@itd-api/testing'
import { FeedTab, ItdClient } from 'itd-api'
import { describe, expect, it } from 'vitest'
import { DEMO_USER, sandboxSeed } from '../server/fixtures/seed'
import { collectCalls, inspector } from '../server/utils/inspector'

/**
 * Журнал вызовов — то, что видит панель «под капотом».
 *
 * Проверяется, что запись появляется на каждый вызов, что повторы и попадания в кэш
 * различимы и что неудачный вызов тоже попадает в журнал.
 */
describe('журнал вызовов', () => {
  it('записывает вызов с длительностью и путём', async () => {
    const server = createMockServer({ seed: sandboxSeed() })
    const itd = new ItdClient(server.clientOptions({ as: DEMO_USER }))
    itd.use(inspector())

    const collected = await collectCalls(() => itd.posts.list({ tab: FeedTab.Popular, limit: 5 }))

    expect(collected.ok).toBe(true)
    expect(collected.meta).toHaveLength(1)
    expect(collected.meta[0]).toMatchObject({ op: 'posts.list', method: 'GET', attempts: 1, cached: false })
    expect(collected.meta[0]?.path).toContain('/api/')
    expect(collected.meta[0]?.ms).toBeGreaterThanOrEqual(0)
  })

  it('отмечает ответ из кэша', async () => {
    const server = createMockServer({ seed: sandboxSeed() })
    const itd = new ItdClient(server.clientOptions({ as: DEMO_USER }))
    itd.use(inspector())
    itd.use(cache({ ttl: 30_000, operations: ['users.me'] }))

    await collectCalls(() => itd.users.me())
    const second = await collectCalls(() => itd.users.me())

    // Повторный вызов не дошёл до сети — значит ответ пришёл из кэша.
    expect(second.meta[0]?.cached).toBe(true)
    expect(second.meta[0]?.attempts).toBe(0)
  })

  it('записывает неудачный вызов вместе с кодом ошибки', async () => {
    const mock = createMockFetch()
    mock.get('/api/users/me', [apiErrorResponse(404, 'NOT_FOUND', 'Пользователь не найден')])

    const itd = new ItdClient({ fetch: mock.fetch, auth: 'test-token' })
    itd.use(inspector())

    const collected = await collectCalls(() => itd.users.me())

    expect(collected.ok).toBe(false)
    expect(collected.meta).toHaveLength(1)
    expect(collected.meta[0]?.error?.code).toBe('NOT_FOUND')
    expect(collected.meta[0]?.status).toBe(404)
  })

  it('не разворачивает двоичное тело в журнал', async () => {
    const mock = createMockFetch()
    mock.post('/api/files', [apiResponse({ id: 'file-1' })])

    const itd = new ItdClient({ fetch: mock.fetch, auth: 'test-token' })
    itd.use(inspector())

    // Мегабайт байтов: если тело попадёт в JSON, оно превратится в массив чисел и съест
    // память — именно так падал сервер при загрузке вложения.
    const payload = new Blob([new Uint8Array(1024 * 1024)], { type: 'image/png' })
    const collected = await collectCalls(() =>
      itd.request({ method: 'POST', path: '/api/files', body: payload }),
    )

    expect(collected.ok).toBe(true)
    expect(collected.meta[0]?.args).toEqual({ body: { binary: 'image/png', bytes: 1024 * 1024 } })
    expect(JSON.stringify(collected.meta[0]?.args).length).toBeLessThan(200)
  })

  it('считает повторные попытки одной операции', async () => {
    const mock = createMockFetch()
    mock.get('/api/users/me', [
      apiErrorResponse(503, 'TEMPORARY', 'Повторите запрос'),
      apiResponse(userFixture({ username: 'alice' })),
    ])

    const itd = new ItdClient({ fetch: mock.fetch, auth: 'test-token' })
    itd.use(inspector())

    const collected = await collectCalls(() => itd.users.me())

    expect(collected.ok).toBe(true)
    expect(collected.meta[0]?.attempts).toBe(2)
  })
})
