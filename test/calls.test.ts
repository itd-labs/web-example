import { describe, expect, it } from 'vitest'
import type { ItdCallMeta } from '../shared/itd'
import { callSignature } from '../app/utils/calls'

/** Заготовка записи журнала: в подписи участвуют только эти поля. */
function meta(op: string, path: string, args?: unknown): ItdCallMeta {
  return { op, method: 'GET', path, args, ms: 1, attempts: 1, cached: false }
}

/**
 * Подпись вызова в журнале.
 *
 * Идентификаторы прячутся в пути, а не в аргументах, поэтому их приходится доставать
 * оттуда — и делать это так, чтобы не спутать `post-3` со словом `comments`.
 */
describe('подпись вызова', () => {
  it('достаёт идентификатор из середины пути', () => {
    expect(callSignature(meta('posts.comments', '/api/posts/post-3/comments', {
      query: { limit: 20, sort: 'newest' },
    }))).toBe('posts.comments(\'post-3\', {"limit":20,"sort":"newest"})')
  })

  it('понимает имя пользователя', () => {
    expect(callSignature(meta('users.get', '/api/users/nowkie'))).toBe('users.get(\'nowkie\')')
  })

  it('оставляет список без лишних аргументов', () => {
    expect(callSignature(meta('posts.list', '/api/posts', { query: { tab: 'popular' } })))
      .toBe('posts.list({"tab":"popular"})')
  })

  it('не принимает хвост маршрута за аргумент', () => {
    expect(callSignature(meta('posts.like', '/api/posts/p1/like'))).toBe('posts.like(\'p1\')')
    expect(callSignature(meta('comments.replies', '/api/comments/c1/replies')))
      .toBe('comments.replies(\'c1\')')
    expect(callSignature(meta('notifications.markRead', '/api/notifications/n1/read')))
      .toBe('notifications.markRead(\'n1\')')
  })

  it('различает хэштег и слово маршрута', () => {
    expect(callSignature(meta('hashtags.posts', '/api/hashtags/itd/posts')))
      .toBe('hashtags.posts(\'itd\')')
  })
})
