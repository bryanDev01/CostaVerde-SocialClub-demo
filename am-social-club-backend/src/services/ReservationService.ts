import { ReservationQuery } from '../db/queries/reservations.js'
import { ActivityQuery } from '../db/queries/activities.js'
import { UserQuery } from '../db/queries/users.js'
import { SubscriptionQuery } from '../db/queries/subscriptions.js'
import { NotificationService } from './NotificationService.js'
import { withTransaction } from '../db/transactions.js'
import { parseDate, addDays, clubToday, clubDateToUtc, toDateOnly } from '../utils/helpers.js'
import { env } from '../config/env.js'
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js'
import type {
  Reservation,
  ReservationWithDetails,
  CreateReservationPayload,
  AffinityCheckResult,
} from '../types/reservation.js'
import type { UserRole } from '../types/user.js'

const STAFF_ROLES: UserRole[] = ['admin', 'receptionist']
const RESERVABLE_STATUSES = ['active', 'external_active'] as const

export class ReservationService {
  static async create(
    payload: CreateReservationPayload,
    _actorRole: UserRole
  ): Promise<Reservation> {
    if (!payload.activity_id) {
      throw new ValidationError('activity_id is required')
    }
    if (!Number.isInteger(payload.quantity) || payload.quantity < 1) {
      throw new ValidationError('quantity must be an integer >= 1')
    }

    parseDate(payload.reservation_date)
    if (payload.reservation_date < clubToday()) {
      throw new ValidationError('Reservation date cannot be in the past')
    }

    const activity = await ActivityQuery.getById(payload.activity_id)
    if (!activity) throw new NotFoundError('Activity not found')
    if (!activity.is_active) {
      throw new ConflictError('Activity is not active')
    }
    if (!activity.is_reservable) {
      throw new ConflictError('This place is free access and does not require a reservation')
    }

    const user = await UserQuery.getProfileById(payload.user_id)
    if (!user) throw new NotFoundError('User not found')

    // Only members (role 'user') can hold reservations. Staff accounts have no
    // subscription and must not appear in the member flows or their notifications.
    if ((user.role_name ?? 'user') !== 'user') {
      throw new ForbiddenError('Staff accounts cannot make reservations')
    }

    if (!RESERVABLE_STATUSES.includes(user.user_status as typeof RESERVABLE_STATUSES[number])) {
      throw new ForbiddenError(
        `Cannot reserve: user status is ${user.user_status}. Complete payment first.`
      )
    }

    // Staff-created reservations (receptionist desk) are only for external users.
    if (payload.created_by_user_id && user.user_type !== 'external') {
      throw new ValidationError(
        'Staff can only create reservations for external users'
      )
    }

    if (user.user_type === 'corporate') {
      const subscription = await SubscriptionQuery.getActiveByUserId(user.id)
      if (!subscription) {
        throw new ForbiddenError('Active subscription required to reserve')
      }
      // RF-008: reservation dates are allowed up to the end of the grace period.
      if (subscription.expires_at) {
        const graceEnd = addDays(new Date(subscription.expires_at), env.GRACE_PERIOD_DAYS)
        if (clubDateToUtc(payload.reservation_date) > graceEnd) {
          throw new ConflictError('Subscription expires before the reservation date')
        }
      }
    }

    const reservation = await ReservationQuery.createWithAffinityCheck(payload)
    await NotificationService.notifyUser(user.id, {
      type: 'reservation_created',
      title: 'Reserva confirmada',
      message: `Tu reserva para el ${payload.reservation_date} quedó confirmada.`,
    })
    return reservation
  }

  static async checkAvailability(
    activityId: string,
    reservationDate: string,
    quantity: number,
    userId: string
  ): Promise<AffinityCheckResult> {
    parseDate(reservationDate)
    const user = await UserQuery.getById(userId)
    if (!user) throw new NotFoundError('User not found')
    return ReservationQuery.checkAffinity(
      activityId,
      reservationDate,
      quantity,
      userId,
      user.user_type
    )
  }

  static async listByUser(userId: string): Promise<Reservation[]> {
    return ReservationQuery.getByUserId(userId)
  }

  static async listActiveByUser(userId: string): Promise<Reservation[]> {
    return ReservationQuery.getActiveByUserId(userId)
  }

  static async getAllWithDetails(): Promise<ReservationWithDetails[]> {
    return ReservationQuery.getAllWithDetails()
  }

  static async getById(id: string): Promise<ReservationWithDetails> {
    const reservation = await ReservationQuery.getWithDetails(id)
    if (!reservation) throw new NotFoundError('Reservation not found')
    return reservation
  }

  static async cancel(
    id: string,
    requesterId: string,
    requesterRole: UserRole
  ): Promise<Reservation> {
    const reservation = await ReservationQuery.getById(id)
    if (!reservation) throw new NotFoundError('Reservation not found')

    const isOwner = reservation.user_id === requesterId
    if (!isOwner && !STAFF_ROLES.includes(requesterRole)) {
      throw new ForbiddenError('Cannot cancel a reservation of another user')
    }

    const cancelled = await ReservationQuery.cancel(id)
    if (!cancelled) throw new NotFoundError('Reservation not found')

    await NotificationService.notifyUser(reservation.user_id, {
      type: 'reservation_cancelled',
      title: 'Reserva cancelada',
      message: `Tu reserva para el ${cancelled.reservation_date} fue cancelada.`,
    })

    return cancelled
  }

  /**
   * RF-011: user reconfirms attendance after the 48h reminder
   * (pending_reminder -> confirmed with user_confirmed_at timestamp).
   */
  static async confirmAttendance(id: string, userId: string): Promise<Reservation> {
    const result = await withTransaction(async (client) => {
      const locked = await client.query(
        'SELECT * FROM reservations WHERE id = $1 FOR UPDATE',
        [id]
      )
      if (locked.rows.length === 0) throw new NotFoundError('Reservation not found')

      const reservation = locked.rows[0] as Reservation
      if (reservation.user_id !== userId) {
        throw new ForbiddenError('Cannot confirm a reservation of another user')
      }
      if (reservation.status !== 'pending_reminder') {
        throw new ConflictError(
          `Cannot confirm attendance from status: ${reservation.status}`
        )
      }

      const updated = await client.query(
        `UPDATE reservations
         SET status = 'confirmed', user_confirmed_at = NOW()
         WHERE id = $1 AND status = 'pending_reminder'
         RETURNING *`,
        [id]
      )
      if (updated.rows.length === 0) throw new ConflictError('Reservation status changed concurrently')
      return updated.rows[0] as Reservation
    })

    return result
  }

  static async markNoShow(id: string): Promise<Reservation> {
    const result = await withTransaction(async (client) => {
      const locked = await client.query(
        'SELECT * FROM reservations WHERE id = $1 FOR UPDATE',
        [id]
      )
      if (locked.rows.length === 0) throw new NotFoundError('Reservation not found')

      const reservation = locked.rows[0] as Reservation
      if (reservation.status !== 'confirmed' && reservation.status !== 'pending_reminder') {
        throw new ConflictError(
          `Cannot mark no-show from status: ${reservation.status}`
        )
      }

      const noShow = await client.query(
        `UPDATE reservations SET status = 'no_show'
         WHERE id = $1 AND status IN ('confirmed', 'pending_reminder')
         RETURNING *`,
        [id]
      )
      if (noShow.rows.length === 0) {
        throw new ConflictError('Reservation status changed concurrently')
      }
      await client.query(
        'UPDATE activities SET reserved_count = GREATEST(reserved_count - $1, 0) WHERE id = $2',
        [reservation.quantity, reservation.activity_id]
      )
      const updated = await client.query(
        'SELECT * FROM reservations WHERE id = $1',
        [id]
      )
      return updated.rows[0] as Reservation
    })

    await NotificationService.notifyUser(result.user_id, {
      type: 'no_show',
      title: 'Reserva marcada como no asistida',
      message: `No registramos tu asistencia a la reserva del ${result.reservation_date}. Si fue un error, contacta a recepción.`,
    })

    return result
  }

  static async getPendingReminders(): Promise<Reservation[]> {
    return ReservationQuery.getPendingReminders()
  }

  static async getConfirmedWithin48h(): Promise<Reservation[]> {
    return ReservationQuery.getConfirmedWithin48h(clubToday())
  }

  static async transitionToPendingReminder(id: string): Promise<Reservation> {
    const updated = await ReservationQuery.markPendingReminder(id)
    if (!updated) throw new NotFoundError('Reservation not found or not in confirmed status')
    return updated
  }

  static async markReminderSent(id: string): Promise<Reservation> {
    const updated = await ReservationQuery.markReminderSent(id)
    if (!updated) throw new NotFoundError('Reservation not found')
    return updated
  }

  /** RF-011: notify the 48h attendance reminder and flag it as sent. */
  static async notifyPendingReminder(id: string): Promise<Reservation> {
    const reservation = await ReservationQuery.getById(id)
    if (!reservation) throw new NotFoundError('Reservation not found')

    await NotificationService.notifyUser(reservation.user_id, {
      type: 'reservation_reminder',
      title: 'Confirma tu asistencia',
      message: `Tu reserva para el ${toDateOnly(reservation.reservation_date)} está a menos de 48 horas. Confirma tu asistencia antes de que empiece ese día: si no confirmas, la reserva se libera automáticamente.`,
    })
    return ReservationService.markReminderSent(id)
  }

  static async autoCancelUnconfirmed(): Promise<number> {
    const expired = await ReservationQuery.getUnconfirmedPastDeadline(clubToday())
    let count = 0
    for (const reservation of expired) {
      try {
        await ReservationQuery.cancel(reservation.id)
        await NotificationService.notifyUser(reservation.user_id, {
          type: 'reservation_cancelled',
          title: 'Reserva cancelada automáticamente',
          message: `No confirmaste tu asistencia a la reserva del ${toDateOnly(reservation.reservation_date)} antes del plazo; la reserva fue liberada y los cupos volvieron a estar disponibles.`,
        })
        count++
      } catch (error) {
        console.error(`Failed to auto-cancel reservation ${reservation.id}:`, error)
      }
    }
    if (count > 0) {
      // The cancellations are already committed. A counter recalculation must
      // not turn a successful release into a failed job.
      try {
        await ReservationQuery.recalculateReservedCounts()
      } catch (error) {
        console.error('Failed to recalculate reserved counts:', error)
      }
    }
    return count
  }
}
