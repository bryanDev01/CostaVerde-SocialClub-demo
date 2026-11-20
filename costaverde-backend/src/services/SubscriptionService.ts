import { SubscriptionQuery } from '../db/queries/subscriptions.js'
import { UserQuery } from '../db/queries/users.js'
import { NotificationService } from './NotificationService.js'
import { env } from '../config/env.js'
import { addMonths } from '../utils/helpers.js'
import { ConflictError, NotFoundError } from '../utils/errors.js'
import type { Subscription, SubscriptionPlan } from '../types/subscription.js'
import type { PoolClient } from 'pg'

export class SubscriptionService {
  static async getPlans(): Promise<SubscriptionPlan[]> {
    return SubscriptionQuery.getPlans()
  }

  static async getByUserId(userId: string): Promise<Subscription | null> {
    return SubscriptionQuery.getByUserId(userId)
  }

  /**
   * Creates a pending_validation subscription. When a client is provided the
   * insert runs inside the caller's transaction (see PaymentService intent).
   */
  static async createPending(userId: string, planId: string, client?: PoolClient): Promise<Subscription> {
    const user = await UserQuery.getById(userId)
    if (!user) throw new NotFoundError('User not found')

    const existing = await SubscriptionQuery.getByUserId(userId)
    if (existing) {
      if (existing.status === 'pending_validation') {
        throw new ConflictError('A subscription payment is already pending validation')
      }
      if (existing.status === 'validated' && existing.expires_at && existing.expires_at > new Date()) {
        throw new ConflictError('User already has an active subscription')
      }
    }

    const plan = await SubscriptionQuery.getPlanById(planId)
    if (!plan) throw new NotFoundError('Subscription plan not found')

    const payload = {
      user_id: userId,
      plan_id: plan.id,
      price_paid: Number(plan.price_cup),
    }

    if (client) {
      return SubscriptionQuery.createInTx(client, payload)
    }
    return SubscriptionQuery.create(payload)
  }

  static async validate(subscriptionId: string): Promise<Subscription> {
    const subscription = await SubscriptionQuery.getById(subscriptionId)
    if (!subscription) throw new NotFoundError('Subscription not found')
    if (subscription.status !== 'pending_validation') {
      throw new ConflictError(
        `Subscription cannot be validated from status: ${subscription.status}`
      )
    }

    const plan = await SubscriptionQuery.getPlanById(subscription.plan_id)
    if (!plan) throw new NotFoundError('Subscription plan not found')

    const startedAt = new Date()
    const expiresAt = addMonths(startedAt, plan.duration_months)

    const validated = await SubscriptionQuery.updateStatus(
      subscriptionId,
      'validated',
      startedAt,
      expiresAt
    )
    if (!validated) throw new NotFoundError('Subscription not found')

    // DB trigger transitions the user from pending_payment to active
    return validated
  }

  static async reject(subscriptionId: string): Promise<Subscription> {
    const subscription = await SubscriptionQuery.getById(subscriptionId)
    if (!subscription) throw new NotFoundError('Subscription not found')
    if (subscription.status !== 'pending_validation') {
      throw new ConflictError(
        `Subscription cannot be rejected from status: ${subscription.status}`
      )
    }

    const rejected = await SubscriptionQuery.updateStatus(subscriptionId, 'rejected')
    if (!rejected) throw new NotFoundError('Subscription not found')
    return rejected
  }

  static async processExpiredSubscriptions(): Promise<number> {
    const expired = await SubscriptionQuery.getExpired()
    let count = 0
    for (const subscription of expired) {
      await SubscriptionQuery.updateStatus(subscription.id, 'expired')
      await NotificationService.notifyUser(subscription.user_id, {
        type: 'subscription_expired',
        title: 'Tu suscripción venció',
        message: `Tu suscripción venció. Tienes ${env.GRACE_PERIOD_DAYS} días de gracia para regularizar el pago antes de la suspensión.`,
      })
      count++
    }
    return count
  }

  static async suspendUsersPastGracePeriod(): Promise<number> {
    const rows = await SubscriptionQuery.getUsersPastGracePeriod(env.GRACE_PERIOD_DAYS)
    let count = 0
    for (const row of rows) {
      await UserQuery.updateStatus(row.user_id, 'suspended')
      await NotificationService.notifyUser(row.user_id, {
        type: 'account_suspended',
        title: 'Tu cuenta fue suspendida por falta de pago',
        message:
          'Terminó tu período de gracia sin un pago validado. Regulariza tu suscripción para recuperar el acceso al club.',
      })
      count++
    }
    return count
  }

  static async getExpiringSoon(days: number = 3): Promise<Subscription[]> {
    return SubscriptionQuery.getExpiringSoon(days)
  }
}
