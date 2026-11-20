import { pool } from '../connection.js'
import type {
  CreateNotificationPayload,
  Notification,
  NotificationChannel,
} from '../../types/notification.js'

export interface ListNotificationsOptions {
  unreadOnly?: boolean
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 30
const MAX_LIMIT = 100

export class NotificationQuery {
  static async create(payload: CreateNotificationPayload): Promise<Notification> {
    const result = await pool.query<Notification>(
      `INSERT INTO notifications (user_id, type, title, message, channel, status, sent_at)
       VALUES ($1, $2, $3, $4, $5, 'sent', NOW())
       RETURNING *`,
      [
        payload.user_id,
        payload.type,
        payload.title,
        payload.message ?? null,
        payload.channel ?? ('in_app' satisfies NotificationChannel),
      ]
    )
    return result.rows[0]
  }

  /** Bulk insert one notification per recipient in a single round trip. */
  static async createForMany(
    userIds: string[],
    payload: Omit<CreateNotificationPayload, 'user_id'>
  ): Promise<number> {
    if (userIds.length === 0) return 0

    const channel = payload.channel ?? 'in_app'
    const values: unknown[] = []
    const channelPlaceholder = userIds.length * 4 + 1
    const placeholders = userIds.map((userId, index) => {
      const base = index * 4
      values.push(userId, payload.type, payload.title, payload.message ?? null)
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${channelPlaceholder}, 'sent', NOW())`
    })

    // channel is the same for every row; append it once at the end.
    values.push(channel)

    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, channel, status, sent_at)
       VALUES ${placeholders.join(', ')}`,
      values
    )
    return result.rowCount ?? 0
  }

  static async listByUser(
    userId: string,
    options: ListNotificationsOptions = {}
  ): Promise<Notification[]> {
    const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
    const offset = options.offset ?? 0
    const unreadClause = options.unreadOnly ? 'AND read_at IS NULL' : ''

    const result = await pool.query<Notification>(
      `SELECT * FROM notifications
       WHERE user_id = $1 ${unreadClause}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )
    return result.rows
  }

  static async countUnread(userId: string): Promise<number> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM notifications
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId]
    )
    return parseInt(result.rows[0].count, 10)
  }

  static async markRead(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, NOW())
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    return (result.rowCount ?? 0) > 0
  }

  static async markAllRead(userId: string): Promise<number> {
    const result = await pool.query(
      `UPDATE notifications SET read_at = NOW()
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId]
    )
    return result.rowCount ?? 0
  }

  /** Deletes one notification, only if it belongs to the given user. */
  static async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    return (result.rowCount ?? 0) > 0
  }

  /** Resolve the ids of every user holding one of the given roles. */
  static async getUserIdsByRoles(roles: string[]): Promise<string[]> {
    if (roles.length === 0) return []
    const result = await pool.query<{ id: string }>(
      `SELECT u.id
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.name = ANY($1)
       AND u.user_status NOT IN ('inactive', 'pending_activation')`,
      [roles]
    )
    return result.rows.map((row) => row.id)
  }
}
