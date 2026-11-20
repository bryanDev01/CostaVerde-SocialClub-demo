import { pool } from '../connection.js'
import { clubToday } from '../../utils/helpers.js'

export interface OccupancyRawRow {
  activity_id: string
  activity_name: string
  category_name: string
  capacity: number
  reservation_date: Date | string | null
  reservation_count: string
  total_reserved: string
}

export interface RevenueTotalsRawRow {
  total_cup: string
  subscription_count: string
  per_visit_count: string
}

export interface RevenueByPlanRawRow {
  plan_name: string
  duration_months: string
  count: string
  total_cup: string
}

export interface ValidatedPaymentsDayRawRow {
  day: string
  validated_count: string
  payers_count: string
  subscription_count: string
  per_visit_count: string
  subscription_cup: string
  per_visit_cup: string
  total_cup: string
}

export interface PendingRejectedPaymentsDayRawRow {
  day: string
  pending_count: string
  rejected_count: string
}

export interface LocationUsageRawRow {
  location: string
  activity_count: string
  daily_capacity: string
  total_reserved: string
  reservation_count: string
}

export interface LocationEventUsageRawRow {
  location: string
  event_count: string
  booking_count: string
  total_guests: string
}

export interface GeneralNewUsersRawRow {
  total: string
  corporate: string
  external: string
}

export interface PrecargaFunnelRawRow {
  total: string
  activated: string
  pending: string
  rejected: string
}

export interface ReservationOutcomesRawRow {
  total: string
  completed: string
  cancelled: string
  no_show: string
}

export interface TopActivityRawRow {
  activity_id: string
  activity_name: string
  total_reserved: string
  reservation_count: string
}

export interface TopCompanyRawRow {
  company_id: string
  company_name: string
  total_reserved: string
  active_members: string
}

export interface EventStatsRawRow {
  total: string
  confirmed_count: string
  cancelled_count: string
  pending_payment_count: string
  contract_value_cup: string
}

export interface GeneralScalarsRawRow {
  payment_total_cup: string
  subscription_count: string
  per_visit_count: string
  new_users: string
  new_corporate: string
  new_external: string
  precarga_total: string
  precarga_activated: string
  precarga_pending: string
  precarga_rejected: string
  reservations_total: string
  reservations_completed: string
  reservations_cancelled: string
  reservations_no_show: string
  suspended_users: string
  pending_payments: string
  events_total: string
  events_confirmed: string
  events_cancelled: string
  events_pending_payment: string
  events_contract_value: string
}

export interface DailyActivityRawRow {
  activity_id: string
  activity_name: string
  category_name: string | null
  location: string | null
  capacity: number
  total_reserved: string
  reservation_count: string
  no_show_count: string
}

export interface DailyAttendeeRawRow {
  activity_id: string
  reservation_id: string
  user_id: string
  user_name: string
  user_ci: string
  user_type: string
  company_name: string | null
  quantity: number
  status: string
  attended_at: Date | string | null
  created_by_name: string | null
}

export interface DailyStatusRawRow {
  status: string
  count: string
  total_quantity: string
  corporate_count: string
  external_count: string
}

export interface DailyEventRawRow {
  id: string
  event_name: string
  location: string
  user_name: string
  user_ci: string
  guest_count: number
  status: string
  total_price_cup: string | number
  payment_status: string | null
}

export class ReportQuery {
  /**
   * Occupancy grouped by activity (and date when range crosses days),
   * excluding cancelled/no_show reservations from counts.
   */
  static async getOccupancyRows(
    startDate?: string,
    endDate?: string
  ): Promise<OccupancyRawRow[]> {
    const params: unknown[] = []
    let paramIndex = 1
    const dateConditions: string[] = []

    if (startDate) {
      dateConditions.push(`r.reservation_date >= $${paramIndex++}`)
      params.push(startDate)
    }
    if (endDate) {
      dateConditions.push(`r.reservation_date <= $${paramIndex++}`)
      params.push(endDate)
    }

    const extraConditions =
      dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : ''

    const result = await pool.query<OccupancyRawRow>(
      `SELECT
         a.id AS activity_id,
         a.name AS activity_name,
         ac.name AS category_name,
         a.capacity,
         r.reservation_date AS reservation_date,
         COUNT(r.id) AS reservation_count,
         COALESCE(SUM(r.quantity), 0) AS total_reserved
       FROM activities a
       LEFT JOIN activity_categories ac ON a.category_id = ac.id
       LEFT JOIN reservations r ON r.activity_id = a.id
         AND r.status NOT IN ('cancelled', 'no_show')
         ${extraConditions}
       WHERE a.is_reservable = true
       GROUP BY a.id, a.name, ac.name, a.capacity, r.reservation_date
       ORDER BY r.reservation_date DESC, a.name ASC`,
      params
    )

    return result.rows
  }

  /**
   * Validated payment totals for a date range.
   * Uses COALESCE(validated_at, created_at) so reconciliation date drives the report.
   */
  static async getRevenueTotals(
    startDate: string,
    endDate: string
  ): Promise<RevenueTotalsRawRow> {
    const result = await pool.query<RevenueTotalsRawRow>(
      `SELECT
         COALESCE(SUM(amount_cup), 0) AS total_cup,
         COUNT(*) FILTER (WHERE payment_type = 'subscription') AS subscription_count,
         COUNT(*) FILTER (WHERE payment_type = 'per_visit') AS per_visit_count
       FROM payments
       WHERE status = 'validated'
       AND COALESCE(validated_at, created_at) >= $1::date
       AND COALESCE(validated_at, created_at) < ($2::date + INTERVAL '1 day')`,
      [startDate, endDate]
    )
    return result.rows[0]
  }

  static async getRevenueByPlan(
    startDate: string,
    endDate: string
  ): Promise<RevenueByPlanRawRow[]> {
    const result = await pool.query<RevenueByPlanRawRow>(
      `SELECT
         sp.name AS plan_name,
         sp.duration_months,
         COUNT(p.id) AS count,
         COALESCE(SUM(p.amount_cup), 0) AS total_cup
       FROM payments p
       JOIN subscriptions s ON p.subscription_id = s.id
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE p.status = 'validated'
       AND p.payment_type = 'subscription'
       AND COALESCE(p.validated_at, p.created_at) >= $1::date
       AND COALESCE(p.validated_at, p.created_at) < ($2::date + INTERVAL '1 day')
        GROUP BY sp.id, sp.name, sp.duration_months
        ORDER BY sp.duration_months ASC`,
      [startDate, endDate]
    )
    return result.rows
  }

  /**
   * Validated payments aggregated by calendar day (reconciliation date).
   */
  static async getValidatedPaymentsByDay(
    startDate: string,
    endDate: string
  ): Promise<ValidatedPaymentsDayRawRow[]> {
    const result = await pool.query<ValidatedPaymentsDayRawRow>(
      `SELECT
         to_char(COALESCE(validated_at, created_at), 'YYYY-MM-DD') AS day,
         COUNT(*) AS validated_count,
         COUNT(DISTINCT user_id) AS payers_count,
         COUNT(*) FILTER (WHERE payment_type = 'subscription') AS subscription_count,
         COUNT(*) FILTER (WHERE payment_type = 'per_visit') AS per_visit_count,
         COALESCE(SUM(amount_cup) FILTER (WHERE payment_type = 'subscription'), 0) AS subscription_cup,
         COALESCE(SUM(amount_cup) FILTER (WHERE payment_type = 'per_visit'), 0) AS per_visit_cup,
         COALESCE(SUM(amount_cup), 0) AS total_cup
       FROM payments
       WHERE status = 'validated'
       AND COALESCE(validated_at, created_at) >= $1::date
       AND COALESCE(validated_at, created_at) < ($2::date + INTERVAL '1 day')
       GROUP BY day
       ORDER BY day ASC`,
      [startDate, endDate]
    )
    return result.rows
  }

  /**
   * Pending and rejected payments aggregated by creation day (delinquency view).
   */
  static async getPendingRejectedByDay(
    startDate: string,
    endDate: string
  ): Promise<PendingRejectedPaymentsDayRawRow[]> {
    const result = await pool.query<PendingRejectedPaymentsDayRawRow>(
      `SELECT
         to_char(created_at, 'YYYY-MM-DD') AS day,
         COUNT(*) FILTER (WHERE status = 'pending_validation') AS pending_count,
         COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count
       FROM payments
       WHERE status IN ('pending_validation', 'rejected')
       AND created_at >= $1::date
       AND created_at < ($2::date + INTERVAL '1 day')
       GROUP BY day
       ORDER BY day ASC`,
      [startDate, endDate]
    )
    return result.rows
  }

  /** Per-activity occupancy for a single day (active statuses counted). */
  static async getDailyActivities(date: string): Promise<DailyActivityRawRow[]> {
    const result = await pool.query<DailyActivityRawRow>(
      `SELECT
         a.id AS activity_id,
         a.name AS activity_name,
         ac.name AS category_name,
         a.location,
         a.capacity,
         COALESCE(SUM(r.quantity) FILTER (WHERE r.status NOT IN ('cancelled', 'no_show')), 0) AS total_reserved,
         COUNT(r.id) FILTER (WHERE r.status NOT IN ('cancelled', 'no_show')) AS reservation_count,
         COUNT(r.id) FILTER (WHERE r.status = 'no_show') AS no_show_count
       FROM activities a
       LEFT JOIN activity_categories ac ON ac.id = a.category_id
       LEFT JOIN reservations r ON r.activity_id = a.id AND r.reservation_date = $1::date
       WHERE a.is_active = true AND a.is_reservable = true
       GROUP BY a.id, a.name, ac.name, a.location, a.capacity
       ORDER BY a.name ASC`,
      [date]
    )
    return result.rows
  }

  /** Attendee list per activity for a single day (cancelled excluded). */
  static async getDailyAttendees(date: string): Promise<DailyAttendeeRawRow[]> {
    const result = await pool.query<DailyAttendeeRawRow>(
      `SELECT
         r.activity_id,
         r.id AS reservation_id,
         u.id AS user_id,
         u.name AS user_name,
         u.ci AS user_ci,
         u.user_type,
         c.name AS company_name,
         r.quantity,
         r.status,
         r.attended_at,
         creator.name AS created_by_name
       FROM reservations r
       JOIN activities a ON a.id = r.activity_id AND a.is_reservable = true
       JOIN users u ON u.id = r.user_id
       LEFT JOIN companies c ON c.id = u.company_id
       LEFT JOIN users creator ON creator.id = r.created_by_user_id
       WHERE r.reservation_date = $1::date
       AND r.status <> 'cancelled'
       ORDER BY u.name ASC`,
      [date]
    )
    return result.rows
  }

  /** Reservation counts by status for a single day (all statuses). */
  static async getDailyStatusBreakdown(
    date: string
  ): Promise<DailyStatusRawRow[]> {
    const result = await pool.query<DailyStatusRawRow>(
      `SELECT
         r.status,
         COUNT(*) AS count,
         COALESCE(SUM(r.quantity), 0) AS total_quantity,
         COUNT(*) FILTER (WHERE u.user_type = 'corporate') AS corporate_count,
         COUNT(*) FILTER (WHERE u.user_type = 'external') AS external_count
       FROM reservations r
       JOIN activities a ON a.id = r.activity_id AND a.is_reservable = true
       JOIN users u ON u.id = r.user_id
       WHERE r.reservation_date = $1::date
       GROUP BY r.status`,
      [date]
    )
    return result.rows
  }

  /**
   * Per-activity usage for a date range, used to build the location
   * capacity report (aggregated by location in the service layer).
   */
  static async getActivityUsageByLocation(
    startDate: string,
    endDate: string
  ): Promise<LocationUsageRawRow[]> {
    const result = await pool.query<LocationUsageRawRow>(
      `SELECT
         COALESCE(NULLIF(TRIM(a.location), ''), 'Sin local') AS location,
         COUNT(DISTINCT a.id) AS activity_count,
         SUM(a.capacity) AS daily_capacity,
         COALESCE(SUM(res.total_reserved), 0) AS total_reserved,
         COALESCE(SUM(res.reservation_count), 0) AS reservation_count
       FROM activities a
       LEFT JOIN (
         SELECT
           r.activity_id,
           COALESCE(SUM(r.quantity) FILTER (WHERE r.status NOT IN ('cancelled', 'no_show')), 0) AS total_reserved,
           COUNT(*) FILTER (WHERE r.status NOT IN ('cancelled', 'no_show')) AS reservation_count
         FROM reservations r
         WHERE r.reservation_date >= $1::date
         AND r.reservation_date <= $2::date
         GROUP BY r.activity_id
       ) res ON res.activity_id = a.id
       WHERE a.is_active = true AND a.is_reservable = true
       GROUP BY location
       ORDER BY total_reserved DESC`,
      [startDate, endDate]
    )
    return result.rows
  }

  /** Event bookings usage by location for a date range. */
  static async getEventsUsageByLocation(
    startDate: string,
    endDate: string
  ): Promise<LocationEventUsageRawRow[]> {
    const result = await pool.query<LocationEventUsageRawRow>(
      `SELECT
         COALESCE(NULLIF(TRIM(e.location), ''), 'Sin local') AS location,
         COUNT(DISTINCT e.id) AS event_count,
         COUNT(er.id) FILTER (
           WHERE er.status IN ('confirmed', 'completed')
         ) AS booking_count,
         COALESCE(SUM(er.guest_count) FILTER (
           WHERE er.status IN ('confirmed', 'completed')
         ), 0) AS total_guests
       FROM events e
       LEFT JOIN event_reservations er ON er.event_id = e.id
         AND er.event_date >= $1::date
         AND er.event_date <= $2::date
       WHERE e.is_active = true
       GROUP BY location
       ORDER BY total_guests DESC`,
      [startDate, endDate]
    )
    return result.rows
  }

  /** Event bookings scheduled for a single day. */
  static async getDailyEvents(date: string): Promise<DailyEventRawRow[]> {
    const result = await pool.query<DailyEventRawRow>(
      `SELECT
         er.id,
         e.name AS event_name,
         e.location,
         u.name AS user_name,
         u.ci AS user_ci,
         er.guest_count,
         er.status,
         er.total_price_cup,
         p.status AS payment_status
       FROM event_reservations er
       JOIN events e ON e.id = er.event_id
       JOIN users u ON u.id = er.user_id
       LEFT JOIN payments p ON p.id = er.payment_id
       WHERE er.event_date = $1::date
       AND er.status <> 'cancelled'
       ORDER BY e.name ASC`,
      [date]
    )
    return result.rows
  }

  /** Global aforo (people count) for a single day, active statuses. */
  static async getDailyGlobalAforo(date: string): Promise<number> {
    const result = await pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(r.quantity), 0) AS total
       FROM reservations r
       JOIN activities a ON a.id = r.activity_id AND a.is_reservable = true
       WHERE r.reservation_date = $1::date
       AND r.status NOT IN ('cancelled', 'no_show')`,
      [date]
    )
    return parseInt(result.rows[0].total, 10)
  }

  static async countUsers(): Promise<{ total_users: number; active_users: number }> {
    const result = await pool.query<{
      total_users: string
      active_users: string
    }>(
      `SELECT
         COUNT(*) AS total_users,
         COUNT(*) FILTER (WHERE user_status IN ('active', 'external_active')) AS active_users
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.name = 'user'
       AND u.user_type <> 'external'`
    )
    return {
      total_users: parseInt(result.rows[0].total_users, 10),
      active_users: parseInt(result.rows[0].active_users, 10),
    }
  }

  static async countActiveActivities(): Promise<number> {
    const result = await pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM activities WHERE is_active = true AND is_reservable = true`
    )
    return parseInt(result.rows[0].total, 10)
  }

  static async getTodayReservations(today: string = clubToday()): Promise<{
    reservations_today: number
    aforo_today: number
  }> {
    const result = await pool.query<{ count: string; total: string }>(
      `SELECT
         COUNT(*) AS count,
         COALESCE(SUM(r.quantity), 0) AS total
       FROM reservations r
       JOIN activities a ON a.id = r.activity_id AND a.is_reservable = true
       WHERE r.reservation_date = $1::date
       AND r.status NOT IN ('cancelled', 'no_show')`,
      [today]
    )
    return {
      reservations_today: parseInt(result.rows[0].count, 10),
      aforo_today: parseInt(result.rows[0].total, 10),
    }
  }

  static async getMonthRevenue(today: string = clubToday()): Promise<number> {
    const result = await pool.query<{ revenue: string }>(
      `SELECT COALESCE(SUM(amount_cup), 0) AS revenue
       FROM payments
       WHERE status = 'validated'
       AND COALESCE(validated_at, created_at) >= date_trunc('month', $1::date)`,
      [today]
    )
    return parseInt(result.rows[0].revenue, 10)
  }

  static async countPendingPayments(): Promise<number> {
    const result = await pool.query<{ pending: string }>(
      `SELECT COUNT(*) AS pending FROM payments WHERE status = 'pending_validation'`
    )
    return parseInt(result.rows[0].pending, 10)
  }

  /** New users registered in a date range, split by type. */
  static async getNewUsers(
    startDate: string,
    endDate: string
  ): Promise<GeneralNewUsersRawRow> {
    const result = await pool.query<GeneralNewUsersRawRow>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE user_type = 'corporate') AS corporate,
         COUNT(*) FILTER (WHERE user_type = 'external') AS external
      FROM users u
      JOIN roles r ON r.id = u.role_id AND r.name = 'user'
      WHERE u.created_at >= $1::date
      AND u.created_at < ($2::date + INTERVAL '1 day')
      AND u.user_type <> 'external'`,
      [startDate, endDate]
    )
    return result.rows[0]
  }

  /** Precarga (pre_employees) funnel by status. */
  static async getPrecargaFunnel(): Promise<PrecargaFunnelRawRow> {
    const result = await pool.query<PrecargaFunnelRawRow>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'activated') AS activated,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending,
         COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
       FROM pre_employees`
    )
    return result.rows[0]
  }

  /** Reservation outcomes (completed / cancelled / no_show) in a date range. */
  static async getReservationOutcomes(
    startDate: string,
    endDate: string
  ): Promise<ReservationOutcomesRawRow> {
    const result = await pool.query<ReservationOutcomesRawRow>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE r.status = 'completed') AS completed,
         COUNT(*) FILTER (WHERE r.status = 'cancelled') AS cancelled,
         COUNT(*) FILTER (WHERE r.status = 'no_show') AS no_show
       FROM reservations r
       JOIN activities a ON a.id = r.activity_id AND a.is_reservable = true
       WHERE r.reservation_date >= $1::date
       AND r.reservation_date <= $2::date`,
      [startDate, endDate]
    )
    return result.rows[0]
  }

  static async getTopActivities(
    startDate: string,
    endDate: string,
    limit = 5
  ): Promise<TopActivityRawRow[]> {
    const result = await pool.query<TopActivityRawRow>(
      `SELECT
         a.id AS activity_id,
         a.name AS activity_name,
         COALESCE(SUM(r.quantity), 0) AS total_reserved,
         COUNT(r.id) AS reservation_count
       FROM activities a
       JOIN reservations r ON r.activity_id = a.id
       WHERE a.is_reservable = true
       AND r.reservation_date >= $1::date
       AND r.reservation_date <= $2::date
       AND r.status NOT IN ('cancelled', 'no_show')
       GROUP BY a.id, a.name
       ORDER BY total_reserved DESC
       LIMIT $3`,
      [startDate, endDate, limit]
    )
    return result.rows
  }

  static async getTopCompanies(
    startDate: string,
    endDate: string,
    limit = 5
  ): Promise<TopCompanyRawRow[]> {
    const result = await pool.query<TopCompanyRawRow>(
      `SELECT
         c.id AS company_id,
         c.name AS company_name,
         COALESCE(SUM(r.quantity), 0) AS total_reserved,
         COUNT(DISTINCT u.id) AS active_members
       FROM companies c
       JOIN users u ON u.company_id = c.id
      JOIN roles role ON role.id = u.role_id AND role.name = 'user'
       JOIN reservations r ON r.user_id = u.id
       JOIN activities a ON a.id = r.activity_id AND a.is_reservable = true
       WHERE r.reservation_date >= $1::date
       AND r.reservation_date <= $2::date
       AND r.status NOT IN ('cancelled', 'no_show')
       GROUP BY c.id, c.name
       ORDER BY total_reserved DESC
       LIMIT $3`,
      [startDate, endDate, limit]
    )
    return result.rows
  }

  static async countSuspendedUsers(): Promise<number> {
    const result = await pool.query<{ suspended: string }>(
      `SELECT COUNT(*) AS suspended
       FROM users u
       JOIN roles r ON r.id = u.role_id AND r.name = 'user'
       WHERE u.user_status = 'suspended'`
    )
    return parseInt(result.rows[0].suspended, 10)
  }

  /** Event bookings outcomes + contract value for a date range. */
  static async getEventStats(
    startDate: string,
    endDate: string
  ): Promise<EventStatsRawRow> {
    const result = await pool.query<EventStatsRawRow>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed')) AS confirmed_count,
         COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
         COUNT(*) FILTER (WHERE status = 'pending_payment') AS pending_payment_count,
         COALESCE(SUM(total_price_cup) FILTER (WHERE status IN ('confirmed', 'completed')), 0) AS contract_value_cup
       FROM event_reservations
       WHERE event_date >= $1::date
       AND event_date <= $2::date`,
      [startDate, endDate]
    )
    return result.rows[0]
  }

  /**
   * All scalar figures for the general report in a single round trip.
   * Keeps the endpoint resilient on high-latency managed databases.
   */
  static async getGeneralScalars(
    startDate: string,
    endDate: string
  ): Promise<GeneralScalarsRawRow> {
    const result = await pool.query<GeneralScalarsRawRow>(
      `SELECT
         (SELECT COALESCE(SUM(amount_cup), 0) FROM payments
           WHERE status = 'validated'
           AND COALESCE(validated_at, created_at) >= $1::date
           AND COALESCE(validated_at, created_at) < ($2::date + INTERVAL '1 day')) AS payment_total_cup,
         (SELECT COUNT(*) FROM payments
           WHERE status = 'validated' AND payment_type = 'subscription'
           AND COALESCE(validated_at, created_at) >= $1::date
           AND COALESCE(validated_at, created_at) < ($2::date + INTERVAL '1 day')) AS subscription_count,
         (SELECT COUNT(*) FROM payments
           WHERE status = 'validated' AND payment_type = 'per_visit'
           AND COALESCE(validated_at, created_at) >= $1::date
           AND COALESCE(validated_at, created_at) < ($2::date + INTERVAL '1 day')) AS per_visit_count,
         (SELECT COUNT(*) FROM users
           WHERE created_at >= $1::date
           AND created_at < ($2::date + INTERVAL '1 day')) AS new_users,
         (SELECT COUNT(*) FROM users
           WHERE user_type = 'corporate'
           AND created_at >= $1::date
           AND created_at < ($2::date + INTERVAL '1 day')) AS new_corporate,
         (SELECT COUNT(*) FROM users
           WHERE user_type = 'external'
           AND created_at >= $1::date
           AND created_at < ($2::date + INTERVAL '1 day')) AS new_external,
         (SELECT COUNT(*) FROM pre_employees) AS precarga_total,
         (SELECT COUNT(*) FROM pre_employees WHERE status = 'activated') AS precarga_activated,
         (SELECT COUNT(*) FROM pre_employees WHERE status = 'pending') AS precarga_pending,
         (SELECT COUNT(*) FROM pre_employees WHERE status = 'rejected') AS precarga_rejected,
         (SELECT COUNT(*) FROM reservations
           WHERE reservation_date >= $1::date
           AND reservation_date <= $2::date
           AND EXISTS (SELECT 1 FROM activities a WHERE a.id = reservations.activity_id AND a.is_reservable = true)) AS reservations_total,
         (SELECT COUNT(*) FROM reservations
           WHERE reservation_date >= $1::date
           AND reservation_date <= $2::date
           AND status = 'completed'
           AND EXISTS (SELECT 1 FROM activities a WHERE a.id = reservations.activity_id AND a.is_reservable = true)) AS reservations_completed,
         (SELECT COUNT(*) FROM reservations
           WHERE reservation_date >= $1::date
           AND reservation_date <= $2::date
           AND status = 'cancelled'
           AND EXISTS (SELECT 1 FROM activities a WHERE a.id = reservations.activity_id AND a.is_reservable = true)) AS reservations_cancelled,
         (SELECT COUNT(*) FROM reservations
           WHERE reservation_date >= $1::date
           AND reservation_date <= $2::date
           AND status = 'no_show'
           AND EXISTS (SELECT 1 FROM activities a WHERE a.id = reservations.activity_id AND a.is_reservable = true)) AS reservations_no_show,
         (SELECT COUNT(*) FROM users
           WHERE user_status = 'suspended') AS suspended_users,
         (SELECT COUNT(*) FROM payments WHERE status = 'pending_validation') AS pending_payments,
         (SELECT COUNT(*) FROM event_reservations
           WHERE event_date >= $1::date
           AND event_date <= $2::date) AS events_total,
         (SELECT COUNT(*) FROM event_reservations
           WHERE event_date >= $1::date
           AND event_date <= $2::date
           AND status IN ('confirmed', 'completed')) AS events_confirmed,
         (SELECT COUNT(*) FROM event_reservations
           WHERE event_date >= $1::date
           AND event_date <= $2::date
           AND status = 'cancelled') AS events_cancelled,
         (SELECT COUNT(*) FROM event_reservations
           WHERE event_date >= $1::date
           AND event_date <= $2::date
           AND status = 'pending_payment') AS events_pending_payment,
         (SELECT COALESCE(SUM(total_price_cup), 0) FROM event_reservations
           WHERE event_date >= $1::date
           AND event_date <= $2::date
           AND status IN ('confirmed', 'completed')) AS events_contract_value`,
      [startDate, endDate]
    )
    return result.rows[0]
  }
}
