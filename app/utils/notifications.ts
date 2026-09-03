import { NotificationType } from 'itd-api'

/** Значок события: имя иконки и цвет. */
export interface NotificationIcon {
  name: string
  class: string
}

const ICONS: Partial<Record<string, NotificationIcon>> = {
  [NotificationType.PostReaction]: { name: 'i-lucide-heart', class: 'text-itd-like' },
  [NotificationType.CommentReaction]: { name: 'i-lucide-heart', class: 'text-itd-like' },
  [NotificationType.PostComment]: { name: 'i-lucide-message-circle', class: 'text-itd-accent' },
  [NotificationType.CommentReply]: { name: 'i-lucide-corner-down-right', class: 'text-itd-accent' },
  [NotificationType.PostRepost]: { name: 'i-lucide-repeat-2', class: 'text-itd-repost' },
  [NotificationType.PostMention]: { name: 'i-lucide-at-sign', class: 'text-itd-accent' },
  [NotificationType.CommentMention]: { name: 'i-lucide-at-sign', class: 'text-itd-accent' },
  [NotificationType.WallPost]: { name: 'i-lucide-pen-line', class: 'text-itd-accent' },
  [NotificationType.Follow]: { name: 'i-lucide-user-plus', class: 'text-itd-accent' },
  [NotificationType.FollowRequest]: { name: 'i-lucide-user-plus', class: 'text-itd-accent' },
  [NotificationType.FollowAccepted]: { name: 'i-lucide-user-check', class: 'text-itd-accent' },
  [NotificationType.VerificationApproved]: {
    name: 'i-lucide-badge-check',
    class: 'text-itd-accent',
  },
  [NotificationType.VerificationRejected]: { name: 'i-lucide-badge-x', class: 'text-red-500' },
}

const FALLBACK: NotificationIcon = { name: 'i-lucide-bell', class: 'text-itd-muted' }

/** Значок по типу уведомления. Неизвестному типу достаётся колокольчик. */
export function notificationIcon(type: string): NotificationIcon {
  return ICONS[type] ?? FALLBACK
}
