import { NotificationQuery } from '../db/queries/notifications.js'
import type { ListNotificationsOptions } from '../db/queries/notifications.js'
import type { Notification, NotificationType } from '../types/notification.js'
import type { UserRole } from '../types/user.js'

export interface NotifyContent {
  type: NotificationType
  title: string
  message?: string | null
}

/**
 * Notification hub. Delivery failures are logged but never bubble up:
 * notifying must not break the core business action that triggered it.
 */
export class NotificationService {
  /** Create an in-app notification for a single user. */
  static async notifyUser(userId: string, content: NotifyContent): Promise<void> {
    try {
      await NotificationQuery.create({ user_id: userId, ...content })
    } catch (error) {
      console.error('NotificationService.notifyUser failed:', error)
    }
  }

  /** Create the same notification for every user holding any of the roles. */
  static async notifyRoles(
    roles: UserRole[],
    content: NotifyContent
  ): Promise<void> {
    try {
      const userIds = await NotificationQuery.getUserIdsByRoles(roles)
      await NotificationQuery.createForMany(userIds, content)
    } catch (error) {
      console.error('NotificationService.notifyRoles failed:', error)
    }
  }

  static async listForUser(
    userId: string,
    options: ListNotificationsOptions = {}
  ): Promise<Notification[]> {
    return NotificationQuery.listByUser(userId, options)
  }

  static async unreadCount(userId: string): Promise<number> {
    return NotificationQuery.countUnread(userId)
  }

  static async markRead(id: string, userId: string): Promise<boolean> {
    return NotificationQuery.markRead(id, userId)
  }

  static async markAllRead(userId: string): Promise<number> {
    return NotificationQuery.markAllRead(userId)
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    return NotificationQuery.delete(id, userId)
  }
}
