import { pool } from '../connection.js'
import { env } from '../../config/env.js'
import type {
  Reservation,
  ReservationStatus,
  CreateReservationPayload,
  AffinityCheckResult,
  ReservationWithDetails,
} from '../../types/reservation.js'
import { ValidationError, ConflictError } from '../../utils/errors.js'
import { clubDateToUtc, clubToday } from '../../utils/helpers.js'
import type { UserType } from '../../types/user.js'

const MAX_SERIALIZATION_RETRIES = 3
const SERIALIZATION_FAILURE_CODE = '40001'
const DEADLOCK_CODE = '40P01'

// RF-011: during the 80/20 priority window (more than 48h before the event),
// at most 20% of the activity capacity can be used by non-corporate users.
const CORPORATE_PRIORITY_SHARE = 0.2
const PRIORITY_WINDOW_HOURS = 48

function isPriorityWindowOpen(reservationDate: string): boolean {
  const eventStart = clubDateToUtc(reservationDate)
  const cutoff = eventStart.getTime() - PRIORITY_WINDOW_HOURS * 60 * 60 * 1000
  return Date.now() < cutoff
}

export class ReservationQuery {
  static async getById(id: string): Promise<Reservation | null> {
    const result = await pool.query(
      'SELECT * FROM reservations WHERE id = $1',
      [id]
    )
    return (result.rows[0] as Reservation) ?? null
  }

  static async getByUserId(userId: string): Promise<Reservation[]> {
    const result = await pool.query(
      `SELECT * FROM reservations
       WHERE user_id = $1
       ORDER BY reservation_date DESC, created_at DESC`,
      [userId]
    )
    return result.rows as Reservation[]
  }

  static async getActiveByUserId(userId: string): Promise<Reservation[]> {
    const result = await pool.query(
      `SELECT * FROM reservations
       WHERE user_id = $1
       AND status IN ('pending', 'confirmed', 'pending_reminder')
       ORDER BY reservation_date ASC`,
      [userId]
    )
    return result.rows as Reservation[]
  }

  static async getActiveByUserIdAndDate(userId: string, date: string): Promise<Reservation[]> {
    const result = await pool.query(
      `SELECT r.*, a.name as activity_name
       FROM reservations r
       JOIN activities a ON r.activity_id = a.id
       WHERE r.user_id = $1
       AND r.reservation_date = $2
       AND r.status IN ('pending', 'confirmed', 'pending_reminder')
       ORDER BY r.created_at DESC`,
      [userId, date]
    )
    return result.rows as Reservation[]
  }

  static async getWithDetails(id: string): Promise<ReservationWithDetails | null> {
    const result = await pool.query(
      `SELECT r.*, u.name as user_name, u.ci as user_ci,
              a.name as activity_name, ac.name as category_name
       FROM reservations r
       JOIN users u ON r.user_id = u.id
       JOIN activities a ON r.activity_id = a.id
       JOIN activity_categories ac ON a.category_id = ac.id
       WHERE r.id = $1`,
      [id]
    )
    return (result.rows[0] as ReservationWithDetails) ?? null
  }

  static async getAllWithDetails(): Promise<ReservationWithDetails[]> {
    const result = await pool.query(
      `SELECT r.*, u.name as user_name, u.ci as user_ci,
              a.name as activity_name, ac.name as category_name
       FROM reservations r
       JOIN users u ON r.user_id = u.id
       JOIN activities a ON r.activity_id = a.id
       JOIN activity_categories ac ON a.category_id = ac.id
       ORDER BY r.reservation_date DESC, r.created_at DESC`
    )
    return result.rows as ReservationWithDetails[]
  }

  static async getPendingReminders(): Promise<Reservation[]> {
    const result = await pool.query(
      `SELECT * FROM reservations
       WHERE status = 'pending_reminder'
       AND is_reminder_sent = false
       ORDER BY reservation_date ASC`
    )
    return result.rows as Reservation[]
  }

  static async getConfirmedWithin48h(today: string = clubToday()): Promise<Reservation[]> {
    const result = await pool.query(
      `SELECT * FROM reservations
       WHERE status = 'confirmed'
       AND reservation_date >= $1::date
       AND reservation_date <= $1::date + INTERVAL '2 days'
       ORDER BY reservation_date ASC`,
      [today]
    )
    return result.rows as Reservation[]
  }

  static async markPendingReminder(id: string): Promise<Reservation | null> {
    const result = await pool.query(
      `UPDATE reservations
       SET status = 'pending_reminder'
       WHERE id = $1 AND status = 'confirmed'
       RETURNING *`,
      [id]
    )
    return (result.rows[0] as Reservation) ?? null
  }

  /**
   * Reservations awaiting confirmation whose deadline has passed: the user had
   * until the start of the reservation day to confirm (the reminder is sent
   * 48h before). Same-day bookings are left alone because they never had a
   * 48h window.
   */
  static async getUnconfirmedPastDeadline(today: string = clubToday()): Promise<Reservation[]> {
    const result = await pool.query(
      `SELECT * FROM reservations
       WHERE status = 'pending_reminder'
       AND reservation_date <= $1::date
       AND created_at::date < reservation_date
       ORDER BY reservation_date ASC`,
      [today]
    )
    return result.rows as Reservation[]
  }

  static async checkAffinity(
    activityId: string,
    reservationDate: string,
    quantity: number,
    userId: string,
    userType: UserType
  ): Promise<AffinityCheckResult> {
    const activityResult = await pool.query(
      'SELECT capacity, is_reservable FROM activities WHERE id = $1',
      [activityId]
    )

    if (activityResult.rows.length === 0) {
      throw new ValidationError('Activity not found')
    }

    const { capacity, is_reservable } = activityResult.rows[0] as {
      capacity: number
      is_reservable: boolean
    }

    // Informational places are free access: nothing to check or reserve.
    if (!is_reservable) {
      return {
        activity_available: false,
        activity_remaining: 0,
        global_available: false,
        global_remaining: 0,
        weekly_available: false,
        weekly_count: 0,
        can_reserve: false,
        reason: 'This place is free access and does not require a reservation',
      }
    }

    // Per-date capacity: the same activity can be booked on different days.
    const activityReservedResult = await pool.query(
      `SELECT COALESCE(SUM(quantity), 0) as total
       FROM reservations
       WHERE activity_id = $1 AND reservation_date = $2
       AND status IN ('pending', 'confirmed', 'pending_reminder')`,
      [activityId, reservationDate]
    )
    const activityReserved = parseInt(activityReservedResult.rows[0].total as string, 10)
    const activityRemaining = Math.max(capacity - activityReserved, 0)
    const activityAvailable = activityRemaining >= quantity

    // RF-011: the global daily cap counts reservations AND visitors (RF-020).
    const dayResult = await pool.query(
      `SELECT
         (SELECT COALESCE(SUM(quantity), 0) FROM reservations
          WHERE reservation_date = $1 AND status NOT IN ('cancelled', 'no_show')) AS reservations_total,
         (SELECT COALESCE(SUM(partner_count + 1), 0) FROM visits
          WHERE visit_date = $1 AND counts_aforo = true) AS visits_total`,
      [reservationDate]
    )
    const dayTotal =
      parseInt(dayResult.rows[0].reservations_total as string, 10) +
      parseInt(dayResult.rows[0].visits_total as string, 10)
    const globalRemaining = Math.max(env.GLOBAL_DAILY_CAPACITY - dayTotal, 0)
    const globalAvailable = globalRemaining >= quantity

    const weekResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM reservations
       WHERE user_id = $1
       AND status IN ('pending', 'confirmed', 'pending_reminder')
       AND reservation_date >= DATE_TRUNC('week', $2::date)
       AND reservation_date < DATE_TRUNC('week', $2::date) + INTERVAL '7 days'`,
      [userId, reservationDate]
    )
    const weeklyCount = parseInt(weekResult.rows[0].count as string, 10)
    const weeklyAvailable = weeklyCount < env.MAX_RESERVATIONS_PER_WEEK

    // RF-011 80/20: outside the last 48h, externals are capped at 20% capacity.
    let priorityWindowAvailable = true
    if (userType !== 'corporate' && isPriorityWindowOpen(reservationDate)) {
      const externalResult = await pool.query(
        `SELECT COALESCE(SUM(r.quantity), 0) as total
         FROM reservations r
         JOIN users u ON u.id = r.user_id
         WHERE r.activity_id = $1
         AND r.reservation_date = $2
         AND r.status != 'cancelled'
         AND u.user_type != 'corporate'`,
        [activityId, reservationDate]
      )
      const externalTotal = parseInt(externalResult.rows[0].total as string, 10)
      const externalQuota = Math.floor(capacity * CORPORATE_PRIORITY_SHARE)
      priorityWindowAvailable = externalTotal + quantity <= externalQuota
    }

    const canReserve =
      activityAvailable &&
      globalAvailable &&
      weeklyAvailable &&
      priorityWindowAvailable
    let reason: string | undefined
    if (!canReserve) {
      if (!activityAvailable) reason = 'Activity capacity exceeded'
      else if (!globalAvailable) reason = 'Global daily capacity exceeded'
      else if (!weeklyAvailable) reason = 'Weekly reservation limit reached'
      else if (!priorityWindowAvailable)
        reason =
          'Corporate priority window: external quota (20%) exceeded for this date'
    }

    return {
      activity_available: activityAvailable,
      activity_remaining: activityRemaining,
      global_available: globalAvailable,
      global_remaining: globalRemaining,
      weekly_available: weeklyAvailable,
      weekly_count: weeklyCount,
      priority_window_available: priorityWindowAvailable,
      can_reserve: canReserve,
      reason,
    }
  }

  static async createWithAffinityCheck(
    payload: CreateReservationPayload
  ): Promise<Reservation> {
    for (let attempt = 1; attempt <= MAX_SERIALIZATION_RETRIES; attempt++) {
      try {
        return await ReservationQuery.executeCreateWithAffinityCheck(payload)
      } catch (error) {
        const errorCode = (error as { code?: string })?.code
        if (
          error instanceof Error &&
          errorCode &&
          (errorCode === SERIALIZATION_FAILURE_CODE || errorCode === DEADLOCK_CODE) &&
          attempt < MAX_SERIALIZATION_RETRIES
        ) {
          console.warn(`Serialization/deadlock failure, retrying (${attempt}/${MAX_SERIALIZATION_RETRIES})`)
          continue
        }
        throw error
      }
    }
    throw new ConflictError('Reservation failed after maximum retries. Please try again.')
  }

  private static async executeCreateWithAffinityCheck(
    payload: CreateReservationPayload
  ): Promise<Reservation> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE')

      // Serialize aforo checks for the same day across reservations and visits.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `aforo:${payload.reservation_date}`,
      ])

      const activityResult = await client.query(
        'SELECT capacity, is_reservable FROM activities WHERE id = $1 FOR UPDATE',
        [payload.activity_id]
      )

      if (activityResult.rows.length === 0) {
        throw new ValidationError('Activity not found')
      }

      const { capacity, is_reservable } = activityResult.rows[0] as {
        capacity: number
        is_reservable: boolean
      }
      if (!is_reservable) {
        throw new ConflictError('This place is free access and does not require a reservation')
      }

      const activityReservedResult = await client.query(
        `SELECT COALESCE(SUM(quantity), 0) as total
         FROM reservations
         WHERE activity_id = $1 AND reservation_date = $2
         AND status IN ('pending', 'confirmed', 'pending_reminder')`,
        [payload.activity_id, payload.reservation_date]
      )
      const activityReserved = parseInt(activityReservedResult.rows[0].total as string, 10)

      if (activityReserved + payload.quantity > capacity) {
        throw new ConflictError('Not enough capacity for this activity')
      }

      const userResult = await client.query(
        'SELECT user_type FROM users WHERE id = $1',
        [payload.user_id]
      )
      if (userResult.rows.length === 0) {
        throw new ValidationError('User not found')
      }
      const userType = (userResult.rows[0] as { user_type: UserType }).user_type

      const dayResult = await client.query(
        `SELECT
           (SELECT COALESCE(SUM(quantity), 0) FROM reservations
            WHERE reservation_date = $1 AND status NOT IN ('cancelled', 'no_show')) AS reservations_total,
           (SELECT COALESCE(SUM(partner_count + 1), 0) FROM visits
            WHERE visit_date = $1 AND counts_aforo = true) AS visits_total`,
        [payload.reservation_date]
      )
      const dayTotal =
        parseInt(dayResult.rows[0].reservations_total as string, 10) +
        parseInt(dayResult.rows[0].visits_total as string, 10) +
        payload.quantity
      if (dayTotal > env.GLOBAL_DAILY_CAPACITY) {
        throw new ConflictError('Global daily capacity exceeded')
      }

      const weekResult = await client.query(
        `SELECT COUNT(*) as count
         FROM reservations
         WHERE user_id = $1
         AND status IN ('pending', 'confirmed', 'pending_reminder')
         AND reservation_date >= DATE_TRUNC('week', $2::date)
         AND reservation_date < DATE_TRUNC('week', $2::date) + INTERVAL '7 days'`,
        [payload.user_id, payload.reservation_date]
      )
      const weeklyCount = parseInt(weekResult.rows[0].count as string, 10)
      if (weeklyCount >= env.MAX_RESERVATIONS_PER_WEEK) {
        throw new ConflictError('Weekly reservation limit reached')
      }

      // RF-011 80/20: outside the last 48h, externals are capped at 20% capacity.
      if (userType !== 'corporate' && isPriorityWindowOpen(payload.reservation_date)) {
        const externalResult = await client.query(
          `SELECT COALESCE(SUM(r.quantity), 0) as total
           FROM reservations r
           JOIN users u ON u.id = r.user_id
           WHERE r.activity_id = $1
           AND r.reservation_date = $2
           AND r.status != 'cancelled'
           AND u.user_type != 'corporate'`,
          [payload.activity_id, payload.reservation_date]
        )
        const externalTotal =
          parseInt(externalResult.rows[0].total as string, 10) + payload.quantity
        const externalQuota = Math.floor(capacity * CORPORATE_PRIORITY_SHARE)
        if (externalTotal > externalQuota) {
          throw new ConflictError(
            'Corporate priority window: external quota (20%) exceeded for this date'
          )
        }
      }

      const result = await client.query(
        `INSERT INTO reservations (user_id, activity_id, reservation_date, quantity, status, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4, 'confirmed', $5, $6)
         RETURNING *`,
        [
          payload.user_id,
          payload.activity_id,
          payload.reservation_date,
          payload.quantity,
          payload.notes ?? null,
          payload.created_by_user_id ?? null,
        ]
      )

      await client.query(
        'UPDATE activities SET reserved_count = reserved_count + $1 WHERE id = $2',
        [payload.quantity, payload.activity_id]
      )

      await client.query('COMMIT')
      return result.rows[0] as Reservation
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /** Active reservation for the member on a given day (used to avoid double aforo). */
  static async hasActiveToday(userId: string, date: string): Promise<boolean> {
    const result = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM reservations
         WHERE user_id = $1 AND reservation_date = $2::date
           AND status IN ('pending', 'confirmed', 'pending_reminder', 'completed')
       ) AS exists`,
      [userId, date]
    )
    return result.rows[0].exists
  }

  static async updateStatus(id: string, status: ReservationStatus): Promise<Reservation | null> {
    const result = await pool.query(
      'UPDATE reservations SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    )
    return (result.rows[0] as Reservation) ?? null
  }

  static async markReminderSent(id: string): Promise<Reservation | null> {
    const result = await pool.query(
      'UPDATE reservations SET is_reminder_sent = true WHERE id = $1 RETURNING *',
      [id]
    )
    return (result.rows[0] as Reservation) ?? null
  }

  static async confirmAttendance(id: string): Promise<Reservation | null> {
    const result = await pool.query(
      `UPDATE reservations
       SET status = 'confirmed', user_confirmed_at = NOW()
       WHERE id = $1 AND status = 'pending_reminder'
       RETURNING *`,
      [id]
    )
    return (result.rows[0] as Reservation) ?? null
  }

  static async cancel(id: string): Promise<Reservation | null> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const reservationResult = await client.query(
        'SELECT * FROM reservations WHERE id = $1 FOR UPDATE',
        [id]
      )

      if (reservationResult.rows.length === 0) {
        throw new ValidationError('Reservation not found')
      }

      const reservation = reservationResult.rows[0] as Reservation
      if (
        reservation.status === 'cancelled' ||
        reservation.status === 'completed' ||
        reservation.status === 'no_show'
      ) {
        throw new ConflictError(`Cannot cancel reservation with status: ${reservation.status}`)
      }

      // Conditional update: only an active reservation can be cancelled. This
      // prevents cancelling a reservation that changed state concurrently and
      // keeps the seat counter from being decremented twice.
      const cancelled = await client.query<Reservation>(
        `UPDATE reservations SET status = 'cancelled'
         WHERE id = $1 AND status IN ('pending', 'confirmed', 'pending_reminder')
         RETURNING *`,
        [id]
      )
      if (cancelled.rows.length === 0) {
        throw new ConflictError('Reservation status changed concurrently')
      }

      await client.query(
        'UPDATE activities SET reserved_count = GREATEST(reserved_count - $1, 0) WHERE id = $2',
        [reservation.quantity, reservation.activity_id]
      )

      await client.query('COMMIT')
      return cancelled.rows[0]
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Recalculate reserved_count from actual active (non-cancelled) future
   * reservations, fixing counter drift (capacity leak) over time.
   */
  static async recalculateReservedCounts(): Promise<void> {
    await pool.query(
      `UPDATE activities a
       SET reserved_count = COALESCE((
         SELECT SUM(r.quantity)
         FROM reservations r
         WHERE r.activity_id = a.id
           AND r.reservation_date >= $1::date
           AND r.status IN ('pending', 'pending_reminder', 'confirmed')
       ), 0)`,
      [clubToday()]
    )
  }
}
