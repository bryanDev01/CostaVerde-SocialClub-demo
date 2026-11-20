import { pool } from '../connection.js'
import { env } from '../../config/env.js'
import type { Subscription, SubscriptionPlan, SubscriptionStatus, CreateSubscriptionPayload } from '../../types/subscription.js'
import type { PoolClient } from 'pg'

export class SubscriptionQuery {
  static async getPlans(): Promise<SubscriptionPlan[]> {
    const result = await pool.query(
      'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY duration_months'
    )
    return result.rows as SubscriptionPlan[]
  }

  static async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    const result = await pool.query(
      'SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true',
      [planId]
    )
    return (result.rows[0] as SubscriptionPlan) ?? null
  }

  static async getPlanByIdInTx(client: PoolClient, planId: string): Promise<SubscriptionPlan | null> {
    const result = await client.query(
      'SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true',
      [planId]
    )
    return (result.rows[0] as SubscriptionPlan) ?? null
  }

  static async getById(id: string): Promise<Subscription | null> {
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [id]
    )
    return (result.rows[0] as Subscription) ?? null
  }

  static async getByUserId(userId: string): Promise<Subscription | null> {
    const result = await pool.query(
      `SELECT * FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    )
    return (result.rows[0] as Subscription) ?? null
  }

  /**
   * Active subscription for operational purposes, RF-008 grace-period aware:
   * a validated subscription that expired within the last GRACE_PERIOD_DAYS
   * still allows the user to operate (status may be 'validated' or 'expired').
   */
  static async getActiveByUserId(userId: string): Promise<Subscription | null> {
    const result = await pool.query(
      `SELECT * FROM subscriptions
       WHERE user_id = $1
       AND status IN ('validated', 'expired')
       AND (expires_at IS NULL OR expires_at > NOW() - INTERVAL '1 day' * $2)
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, env.GRACE_PERIOD_DAYS]
    )
    return (result.rows[0] as Subscription) ?? null
  }

  static async getExpiringSoon(days: number = 3): Promise<Subscription[]> {
    const result = await pool.query(
      `SELECT * FROM subscriptions
       WHERE status = 'validated'
       AND expires_at IS NOT NULL
       AND expires_at <= NOW() + INTERVAL '1 day' * $1
       AND expires_at > NOW()`,
      [days]
    )
    return result.rows as Subscription[]
  }

  static async getExpired(): Promise<Subscription[]> {
    const result = await pool.query(
      `SELECT * FROM subscriptions
       WHERE status = 'validated'
       AND expires_at IS NOT NULL
       AND expires_at <= NOW()`
    )
    return result.rows as Subscription[]
  }

  static async getUsersPastGracePeriod(graceDays: number): Promise<Array<{ user_id: string; subscription_id: string; expires_at: Date }>> {
    const result = await pool.query(
      `SELECT s.user_id, s.id as subscription_id, s.expires_at
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       WHERE s.status = 'expired'
       AND u.user_status = 'active'
       AND s.expires_at IS NOT NULL
       AND s.expires_at <= NOW() - INTERVAL '1 day' * $1
       AND NOT EXISTS (
         SELECT 1 FROM subscriptions s2
         WHERE s2.user_id = s.user_id
         AND s2.status = 'validated'
         AND s2.created_at > s.created_at
       )`,
      [graceDays]
    )
    return result.rows as Array<{ user_id: string; subscription_id: string; expires_at: Date }>
  }

  static async create(payload: CreateSubscriptionPayload): Promise<Subscription> {
    const result = await pool.query(
      `INSERT INTO subscriptions (user_id, plan_id, price_paid, status)
       VALUES ($1, $2, $3, 'pending_validation')
       RETURNING *`,
      [payload.user_id, payload.plan_id, payload.price_paid]
    )
    return result.rows[0] as Subscription
  }

  static async createInTx(client: PoolClient, payload: CreateSubscriptionPayload): Promise<Subscription> {
    const result = await client.query(
      `INSERT INTO subscriptions (user_id, plan_id, price_paid, status)
       VALUES ($1, $2, $3, 'pending_validation')
       RETURNING *`,
      [payload.user_id, payload.plan_id, payload.price_paid]
    )
    return result.rows[0] as Subscription
  }

  static async updateStatus(
    id: string,
    status: SubscriptionStatus,
    startedAt?: Date,
    expiresAt?: Date
  ): Promise<Subscription | null> {
    const result = await pool.query(
      `UPDATE subscriptions
       SET status = $1, started_at = COALESCE($2, started_at), expires_at = COALESCE($3, expires_at)
       WHERE id = $4
       RETURNING *`,
      [status, startedAt ?? null, expiresAt ?? null, id]
    )
    return (result.rows[0] as Subscription) ?? null
  }

  static async updateStatusInTx(
    client: PoolClient,
    id: string,
    status: SubscriptionStatus,
    startedAt?: Date,
    expiresAt?: Date
  ): Promise<Subscription | null> {
    const result = await client.query(
      `UPDATE subscriptions
       SET status = $1, started_at = COALESCE($2, started_at), expires_at = COALESCE($3, expires_at)
       WHERE id = $4
       RETURNING *`,
      [status, startedAt ?? null, expiresAt ?? null, id]
    )
    return (result.rows[0] as Subscription) ?? null
  }

  static async setGracePeriod(id: string, isGrace: boolean): Promise<Subscription | null> {
    const result = await pool.query(
      'UPDATE subscriptions SET is_grace_period = $1 WHERE id = $2 RETURNING *',
      [isGrace, id]
    )
    return (result.rows[0] as Subscription) ?? null
  }
}
