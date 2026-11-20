import { PaymentQuery } from '../db/queries/payments.js'
import { ReservationQuery } from '../db/queries/reservations.js'
import { SubscriptionQuery } from '../db/queries/subscriptions.js'
import { UserQuery } from '../db/queries/users.js'
import { SubscriptionService } from './SubscriptionService.js'
import { NotificationService } from './NotificationService.js'
import { withTransaction } from '../db/transactions.js'
import { env } from '../config/env.js'
import { addMonths } from '../utils/helpers.js'
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors.js'
import type { Payment, PaymentWithUser } from '../types/payment.js'
import type { PoolClient } from 'pg'

const EXTERNAL_PER_VISIT_PRICE = 1500

export interface PaymentIntentResult {
  payment: Payment
  qr_url: string
  instructions: string
}

export class PaymentService {
  /**
   * Creates the subscription and its payment intent atomically: either both
   * exist or neither does, and a per-user advisory lock serializes concurrent
   * intents so two subscriptions cannot be created for the same user.
   */
  static async createSubscriptionIntent(
    userId: string,
    planId: string
  ): Promise<PaymentIntentResult> {
    const user = await UserQuery.getById(userId)
    if (!user) throw new NotFoundError('User not found')
    // Subscription plans belong to corporate members. External visitors pay at
    // reception and never use the app.
    if (user.user_type !== 'corporate') {
      throw new ForbiddenError('Subscription plans are only for corporate members')
    }

    const payment = await withTransaction(async (client: PoolClient) => {
      await PaymentQuery.advisoryLockUser(client, userId)
      const subscription = await SubscriptionService.createPending(userId, planId, client)
      return PaymentQuery.createInTx(client, {
        user_id: userId,
        subscription_id: subscription.id,
        amount_cup: Number(subscription.price_paid),
        payment_type: 'subscription',
      })
    })

    return {
      payment,
      qr_url: env.TRANSFERMOVIL_QR_URL,
      instructions:
        'Scan the QR code in Transfermóvil, use the reference code shown, then enter the transaction number from the SMS confirmation.',
    }
  }

  static async confirmTransaction(
    paymentId: string,
    transactionNumber: string,
    userId: string
  ): Promise<Payment> {
    if (!transactionNumber || transactionNumber.trim().length === 0) {
      throw new ValidationError('Transaction number is required')
    }

    const payment = await PaymentQuery.getById(paymentId)
    if (!payment) throw new NotFoundError('Payment not found')
    if (payment.user_id !== userId) {
      throw new ForbiddenError('Cannot confirm a payment of another user')
    }
    if (payment.status !== 'pending_validation') {
      throw new ConflictError(`Payment is already ${payment.status}`)
    }

    const updated = await PaymentQuery.updateTransactionNumber(
      paymentId,
      transactionNumber.trim()
    )
    if (!updated) throw new NotFoundError('Payment not found')

    await NotificationService.notifyUser(userId, {
      type: 'payment_submitted',
      title: 'Confirmamos tu número de transacción',
      message:
        'Estamos verificando tu pago. Un administrador lo validará en menos de 24 horas y activará tu suscripción.',
    })
    await NotificationService.notifyRoles(['admin'], {
      type: 'payment_submitted',
      title: 'Nuevo pago por validar',
      message: `Un socio confirmó la transacción ${transactionNumber.trim()}. Revísalo en Pagos pendientes.`,
    })

    return updated
  }

  static async getPendingPayments(): Promise<PaymentWithUser[]> {
    return PaymentQuery.getPending()
  }

  static async getById(id: string): Promise<PaymentWithUser> {
    const payment = await PaymentQuery.getWithUser(id)
    if (!payment) throw new NotFoundError('Payment not found')
    return payment
  }

  static async validatePayment(paymentId: string): Promise<Payment> {
    const payment = await PaymentQuery.getById(paymentId)
    if (!payment) throw new NotFoundError('Payment not found')
    if (payment.status !== 'pending_validation') {
      throw new ConflictError(`Payment is already ${payment.status}`)
    }
    if (!payment.transaction_number) {
      throw new ValidationError(
        'Cannot validate payment without a transaction number from the user'
      )
    }

    const result = await withTransaction(async (client: PoolClient) => {
      const lockedPayment = await PaymentQuery.getByIdForUpdate(client, paymentId)
      if (!lockedPayment) throw new NotFoundError('Payment not found')
      if (lockedPayment.status !== 'pending_validation') {
        throw new ConflictError(`Payment is already ${lockedPayment.status}`)
      }

      const validated = await PaymentQuery.validateInTx(client, paymentId)
      if (!validated) throw new ConflictError('Payment validation failed')

      if (validated.payment_type === 'subscription' && validated.subscription_id) {
        const subscription = await client.query(
          'SELECT * FROM subscriptions WHERE id = $1 FOR UPDATE',
          [validated.subscription_id]
        )
        if (subscription.rows.length === 0) {
          throw new NotFoundError('Subscription not found')
        }
        const sub = subscription.rows[0]
        if (sub.status !== 'pending_validation') {
          throw new ConflictError(
            `Subscription cannot be validated from status: ${sub.status}`
          )
        }

        const plan = await SubscriptionQuery.getPlanByIdInTx(client, sub.plan_id)
        if (!plan) throw new NotFoundError('Subscription plan not found')

        const startedAt = new Date()
        const expiresAt = addMonths(startedAt, plan.duration_months)

        await SubscriptionQuery.updateStatusInTx(
          client,
          validated.subscription_id,
          'validated',
          startedAt,
          expiresAt
        )
      }

      return validated
    })

    await NotificationService.notifyUser(result.user_id, {
      type: 'payment_validated',
      title:
        result.payment_type === 'subscription'
          ? 'Suscripción activada'
          : 'Pago validado',
      message:
        result.payment_type === 'subscription'
          ? `Tu pago de $${Number(result.amount_cup)} CUP fue validado. ¡Ya puedes reservar y usar tu carnet!`
          : `Tu pago por visita de $${Number(result.amount_cup)} CUP fue validado.`,
    })

    return result
  }

  static async rejectPayment(paymentId: string): Promise<Payment> {
    const payment = await PaymentQuery.getById(paymentId)
    if (!payment) throw new NotFoundError('Payment not found')
    if (payment.status !== 'pending_validation') {
      throw new ConflictError(`Payment is already ${payment.status}`)
    }

    const result = await withTransaction(async (client: PoolClient) => {
      const lockedPayment = await PaymentQuery.getByIdForUpdate(client, paymentId)
      if (!lockedPayment) throw new NotFoundError('Payment not found')
      if (lockedPayment.status !== 'pending_validation') {
        throw new ConflictError(`Payment is already ${lockedPayment.status}`)
      }

      const rejected = await PaymentQuery.rejectInTx(client, paymentId)
      if (!rejected) throw new ConflictError('Payment rejection failed')

      if (rejected.payment_type === 'subscription' && rejected.subscription_id) {
        await SubscriptionQuery.updateStatusInTx(client, rejected.subscription_id, 'rejected')
      }

      return rejected
    })

    await NotificationService.notifyUser(result.user_id, {
      type: 'payment_rejected',
      title: 'Pago rechazado',
      message:
        'No pudimos validar tu pago. Verifica el número de transacción o contacta a administración indicando tu CI.',
    })

    return result
  }

  static async createPerVisitPayment(
    userId: string,
    reservationId: string
  ): Promise<Payment> {
    const user = await UserQuery.getById(userId)
    if (!user) throw new NotFoundError('User not found')
    if (user.user_type !== 'external') {
      throw new ValidationError('Per-visit payments only apply to external users')
    }

    const reservation = await ReservationQuery.getById(reservationId)
    if (!reservation) throw new NotFoundError('Reservation not found')
    if (reservation.user_id !== userId) {
      throw new ForbiddenError('Reservation belongs to another user')
    }

    const payment = await PaymentQuery.createWithAdvisoryLock({
      user_id: userId,
      reservation_id: reservationId,
      amount_cup: EXTERNAL_PER_VISIT_PRICE,
      payment_type: 'per_visit',
    })

    const validated = await PaymentQuery.validate(payment.id)
    if (!validated) throw new ConflictError('Per-visit payment validation failed')

    await NotificationService.notifyUser(userId, {
      type: 'payment_validated',
      title: 'Pago por visita confirmado',
      message: `Registramos tu pago por visita de $${EXTERNAL_PER_VISIT_PRICE} CUP.`,
    })

    return validated
  }
}
