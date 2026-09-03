import type { LikeResult, Post } from 'itd-api'

/** Что вызывающий код делает с обновлённым постом. */
export type PostPatch = (id: string, update: (post: Post) => Post) => void

/**
 * Реакции и репосты с оптимистичным обновлением.
 *
 * Счётчик меняется сразу, ответ сервера его уточняет, ошибка — возвращает как было.
 * Пока запрос в пути, повторные нажатия по тому же посту игнорируются.
 */
export function usePostActions(patch: PostPatch) {
  const itdFetch = useItdFetch()
  const pending = ref(new Set<string>())

  function busy(id: string) {
    return pending.value.has(id)
  }

  function mark(id: string, value: boolean) {
    const next = new Set(pending.value)
    if (value) next.add(id)
    else next.delete(id)
    pending.value = next
  }

  async function toggleLike(post: Post) {
    if (busy(post.id)) return

    const liked = !post.isLiked
    const before = { isLiked: post.isLiked, likesCount: post.likesCount }

    mark(post.id, true)
    patch(post.id, current => ({
      ...current,
      isLiked: liked,
      likesCount: Math.max(0, current.likesCount + (liked ? 1 : -1)),
    }))

    try {
      const result = await itdFetch<LikeResult>(`/api/posts/${post.id}/like`, {
        method: liked ? 'POST' : 'DELETE',
      })
      patch(post.id, current => ({
        ...current,
        isLiked: result.liked,
        likesCount: result.likesCount,
      }))
    } catch {
      patch(post.id, current => ({ ...current, ...before }))
    } finally {
      mark(post.id, false)
    }
  }

  async function toggleRepost(post: Post) {
    if (busy(post.id)) return

    const reposted = !post.isReposted
    const before = { isReposted: post.isReposted, repostsCount: post.repostsCount }

    mark(post.id, true)
    patch(post.id, current => ({
      ...current,
      isReposted: reposted,
      repostsCount: Math.max(0, current.repostsCount + (reposted ? 1 : -1)),
    }))

    try {
      await itdFetch(`/api/posts/${post.id}/repost`, { method: reposted ? 'POST' : 'DELETE' })
    } catch {
      patch(post.id, current => ({ ...current, ...before }))
    } finally {
      mark(post.id, false)
    }
  }

  return { busy, toggleLike, toggleRepost }
}
