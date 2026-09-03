import {
  formatNotificationText,
  resolveNotificationUrl,
  type Author,
  type Comment,
  type MyProfile,
  type Notification,
  type Post,
  type PublicProfile,
} from 'itd-api'
import type { TextSpan } from '#shared/itd'

/**
 * Чтение полей, которые мог расшифровать `@itd-api/crypto`.
 *
 * Плагин не трогает исходный ответ, а складывает готовое представление в `decoded`.
 * Сервер отдаёт модель как есть, поэтому выбирает между открытым и расшифрованным
 * вариантом тот, кто показывает, — то есть эти функции.
 */

/** Текст поста: расшифрованный, если скрытые участки нашлись. */
export function postText(post: Post): string {
  return post.decoded?.content?.text ?? post.content ?? ''
}

/** Разметка поста в координатах {@link postText}, включая локальные crypto-spans. */
export function postSpans(post: Post): TextSpan[] {
  return post.decoded?.content?.spans ?? post.spans ?? []
}

/** То же для комментария. */
export function commentText(comment: Comment): string {
  return comment.decoded?.content?.text ?? comment.content ?? ''
}

export function commentSpans(comment: Comment): TextSpan[] {
  return comment.decoded?.content?.spans ?? comment.spans ?? []
}

/** Имя автора — в подписи под аватаром оно тоже бывает зашифровано. */
export function authorName(author: Author): string {
  return author.decoded?.displayName?.text ?? author.displayName ?? ''
}

/** Имя из профиля. */
export function profileName(profile: PublicProfile | MyProfile): string {
  return profile.decoded?.displayName?.text ?? profile.displayName ?? ''
}

/** Описание профиля. */
export function profileBio(profile: PublicProfile | MyProfile): string {
  return profile.decoded?.bio?.text ?? profile.bio ?? ''
}

/**
 * Текст уведомления на русском.
 *
 * Считает сама библиотека — ни сервер, ни компонент не собирают фразу из кусков.
 */
export function notificationText(notification: Notification): string {
  return formatNotificationText(notification)
}

/** Путь внутри приложения, на который ведёт уведомление. */
export function notificationUrl(notification: Notification): string {
  return resolveNotificationUrl(notification)
}
