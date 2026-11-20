import { ReportQuery } from '../db/queries/reports.js'
import { ValidationError } from '../utils/errors.js'
import { addDays, formatDate, parseDate, toDateOnly } from '../utils/helpers.js'

export interface OccupancyReport {
  activity_id: string
  activity_name: string
  category_name: string
  capacity: number
  total_reserved: number
  occupancy_percent: number
  reservation_count: number
  date: string
}

export interface RevenueReport {
  total_cup: number
  subscription_count: number
  per_visit_count: number
  by_plan: {
    plan_name: string
    duration_months: number
    count: number
    total_cup: number
  }[]
  period_start: string
  period_end: string
}

export interface PaymentsDayRow {
  date: string
  validated_count: number
  payers_count: number
  subscription_count: number
  per_visit_count: number
  subscription_cup: number
  per_visit_cup: number
  total_cup: number
  pending_count: number
  rejected_count: number
}

export interface PaymentsByDayReport {
  period_start: string
  period_end: string
  days: PaymentsDayRow[]
  totals: {
    validated_count: number
    subscription_count: number
    per_visit_count: number
    subscription_cup: number
    per_visit_cup: number
    total_cup: number
    pending_count: number
    rejected_count: number
  }
}

export interface LocationCapacityRow {
  location: string
  activity_count: number
  daily_capacity: number
  period_capacity: number
  total_reserved: number
  reservation_count: number
  available: number
  occupancy_percent: number
  event_bookings: number
  event_guests: number
}

export interface CapacityReport {
  period_start: string
  period_end: string
  period_days: number
  locations: LocationCapacityRow[]
  summary: {
    most_used: string | null
    least_used: string | null
    total_period_capacity: number
    total_reserved: number
    overall_occupancy_percent: number
  }
}

export interface GeneralReport {
  period_start: string
  period_end: string
  period_days: number
  financial: {
    payments: RevenueReport
    events: {
      total_bookings: number
      confirmed_bookings: number
      cancelled_bookings: number
      pending_payment_bookings: number
      contract_value_cup: number
    }
  }
  users: {
    new_total: number
    new_corporate: number
    new_external: number
    currently_suspended: number
    pending_payments: number
  }
  precarga: {
    total: number
    activated: number
    pending: number
    rejected: number
    conversion_percent: number
  }
  reservations: {
    total: number
    completed: number
    cancelled: number
    no_show: number
    no_show_percent: number
    cancelled_percent: number
  }
  capacity: {
    total_period_capacity: number
    total_reserved: number
    overall_occupancy_percent: number
  }
  top_activities: {
    activity_id: string
    activity_name: string
    total_reserved: number
    reservation_count: number
  }[]
  top_companies: {
    company_id: string
    company_name: string
    total_reserved: number
    active_members: number
  }[]
}

export interface DashboardStats {
  total_users: number
  active_users: number
  total_activities: number
  reservations_today: number
  aforo_today: number
  global_capacity: number
  occupancy_percent: number
  revenue_this_month: number
  pending_payments: number
}

export interface DailyAttendee {
  reservation_id: string
  user_id: string
  user_name: string
  user_ci: string
  user_type: string
  company_name: string | null
  quantity: number
  status: string
  attended_at: string | null
  created_by_name: string | null
}

export interface DailyActivityReport {
  activity_id: string
  activity_name: string
  category_name: string | null
  location: string | null
  capacity: number
  total_reserved: number
  available: number
  occupancy_percent: number
  reservation_count: number
  no_show_count: number
  attendees: DailyAttendee[]
}

export interface DailyEventReport {
  id: string
  event_name: string
  location: string
  user_name: string
  user_ci: string
  guest_count: number
  status: string
  total_price_cup: number
  payment_status: string | null
}

export interface DailyReport {
  date: string
  global_capacity: number
  total_aforo: number
  occupancy_percent: number
  reservations_by_status: Record<string, number>
  corporate_reservations: number
  external_reservations: number
  activities: DailyActivityReport[]
  events: DailyEventReport[]
}

const GLOBAL_CAPACITY = 500
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_PERIOD_DAYS = 92

function assertValidDate(date: string, field: string): void {
  if (!DATE_PATTERN.test(date)) {
    throw new ValidationError(`${field} must use the YYYY-MM-DD format`)
  }
  parseDate(date)
}

/**
 * Validate a start/end range and return the inclusive number of days.
 */
function resolvePeriodDays(startDate: string, endDate: string): number {
  assertValidDate(startDate, 'start_date')
  assertValidDate(endDate, 'end_date')

  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (start.getTime() > end.getTime()) {
    throw new ValidationError('start_date must be before or equal to end_date')
  }
  const periodDays =
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  if (periodDays > MAX_PERIOD_DAYS) {
    throw new ValidationError(
      `Period too long: maximum ${MAX_PERIOD_DAYS} days per request`
    )
  }
  return periodDays
}

function toDateString(value: Date | string | null): string | null {
  if (value === null || value === undefined) return null
  return value instanceof Date ? value.toISOString() : String(value)
}

export class ReportService {
  /**
   * Occupancy report by activity and date range.
   */
  static async getOccupancy(
    startDate?: string,
    endDate?: string
  ): Promise<OccupancyReport[]> {
    if (startDate) assertValidDate(startDate, 'start_date')
    if (endDate) assertValidDate(endDate, 'end_date')

    const rows = await ReportQuery.getOccupancyRows(startDate, endDate)

    return rows.map((row) => ({
      activity_id: row.activity_id,
      activity_name: row.activity_name,
      category_name: row.category_name,
      capacity: row.capacity,
      total_reserved: parseInt(row.total_reserved, 10),
      occupancy_percent:
        row.capacity > 0
          ? Math.round((parseInt(row.total_reserved, 10) / row.capacity) * 100)
          : 0,
      reservation_count: parseInt(row.reservation_count, 10),
      date: toDateOnly(row.reservation_date),
    }))
  }

  /**
   * Revenue report for a given date range (based on validation date).
   */
  static async getRevenue(
    startDate: string,
    endDate: string
  ): Promise<RevenueReport> {
    assertValidDate(startDate, 'start_date')
    assertValidDate(endDate, 'end_date')

    const [totals, byPlanRows] = await Promise.all([
      ReportQuery.getRevenueTotals(startDate, endDate),
      ReportQuery.getRevenueByPlan(startDate, endDate),
    ])

    return {
      total_cup: parseInt(totals.total_cup, 10),
      subscription_count: parseInt(totals.subscription_count, 10),
      per_visit_count: parseInt(totals.per_visit_count, 10),
      by_plan: byPlanRows.map((row) => ({
        plan_name: row.plan_name,
        duration_months: parseInt(row.duration_months, 10),
        count: parseInt(row.count, 10),
        total_cup: parseInt(row.total_cup, 10),
      })),
      period_start: startDate,
      period_end: endDate,
    }
  }

  /**
   * Payments aggregated by calendar day for a date range (max 92 days).
   * Includes zero days so the frontend can chart continuous series.
   */
  static async getPaymentsByDay(
    startDate: string,
    endDate: string
  ): Promise<PaymentsByDayReport> {
    assertValidDate(startDate, 'start_date')
    assertValidDate(endDate, 'end_date')

    const start = parseDate(startDate)
    const end = parseDate(endDate)
    if (start.getTime() > end.getTime()) {
      throw new ValidationError('start_date must be before or equal to end_date')
    }
    const periodDays =
      Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
    if (periodDays > MAX_PERIOD_DAYS) {
      throw new ValidationError(
        `Period too long: maximum ${MAX_PERIOD_DAYS} days per request`
      )
    }

    const [validatedRows, pendingRows] = await Promise.all([
      ReportQuery.getValidatedPaymentsByDay(startDate, endDate),
      ReportQuery.getPendingRejectedByDay(startDate, endDate),
    ])

    const validatedByDay = new Map(validatedRows.map((row) => [row.day, row]))
    const pendingByDay = new Map(pendingRows.map((row) => [row.day, row]))

    const days: PaymentsDayRow[] = []
    const totals = {
      validated_count: 0,
      subscription_count: 0,
      per_visit_count: 0,
      subscription_cup: 0,
      per_visit_cup: 0,
      total_cup: 0,
      pending_count: 0,
      rejected_count: 0,
    }

    for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = addDays(cursor, 1)) {
      const key = formatDate(cursor)
      const validated = validatedByDay.get(key)
      const pending = pendingByDay.get(key)

      const row: PaymentsDayRow = {
        date: key,
        validated_count: validated ? parseInt(validated.validated_count, 10) : 0,
        payers_count: validated ? parseInt(validated.payers_count, 10) : 0,
        subscription_count: validated
          ? parseInt(validated.subscription_count, 10)
          : 0,
        per_visit_count: validated ? parseInt(validated.per_visit_count, 10) : 0,
        subscription_cup: validated ? parseInt(validated.subscription_cup, 10) : 0,
        per_visit_cup: validated ? parseInt(validated.per_visit_cup, 10) : 0,
        total_cup: validated ? parseInt(validated.total_cup, 10) : 0,
        pending_count: pending ? parseInt(pending.pending_count, 10) : 0,
        rejected_count: pending ? parseInt(pending.rejected_count, 10) : 0,
      }

      totals.validated_count += row.validated_count
      totals.subscription_count += row.subscription_count
      totals.per_visit_count += row.per_visit_count
      totals.subscription_cup += row.subscription_cup
      totals.per_visit_cup += row.per_visit_cup
      totals.total_cup += row.total_cup
      totals.pending_count += row.pending_count
      totals.rejected_count += row.rejected_count

      days.push(row)
    }

    return { period_start: startDate, period_end: endDate, days, totals }
  }

  /**
   * Capacity usage grouped by location (venue) for a date range.
   * Period capacity = daily capacity x days; ranking highlights the
   * most and least used locations.
   */
  static async getCapacityByLocation(
    startDate: string,
    endDate: string
  ): Promise<CapacityReport> {
    assertValidDate(startDate, 'start_date')
    assertValidDate(endDate, 'end_date')

    const start = parseDate(startDate)
    const end = parseDate(endDate)
    if (start.getTime() > end.getTime()) {
      throw new ValidationError('start_date must be before or equal to end_date')
    }
    const periodDays =
      Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
    if (periodDays > MAX_PERIOD_DAYS) {
      throw new ValidationError(
        `Period too long: maximum ${MAX_PERIOD_DAYS} days per request`
      )
    }

    const [activityRows, eventRows] = await Promise.all([
      ReportQuery.getActivityUsageByLocation(startDate, endDate),
      ReportQuery.getEventsUsageByLocation(startDate, endDate),
    ])

    const byLocation = new Map<string, LocationCapacityRow>()

    for (const row of activityRows) {
      const dailyCapacity = parseInt(row.daily_capacity, 10)
      const periodCapacity = dailyCapacity * periodDays
      const totalReserved = parseInt(row.total_reserved, 10)
      byLocation.set(row.location, {
        location: row.location,
        activity_count: parseInt(row.activity_count, 10),
        daily_capacity: dailyCapacity,
        period_capacity: periodCapacity,
        total_reserved: totalReserved,
        reservation_count: parseInt(row.reservation_count, 10),
        available: Math.max(periodCapacity - totalReserved, 0),
        occupancy_percent:
          periodCapacity > 0
            ? Math.round((totalReserved / periodCapacity) * 100)
            : 0,
        event_bookings: 0,
        event_guests: 0,
      })
    }

    for (const row of eventRows) {
      const existing = byLocation.get(row.location)
      const bookings = parseInt(row.booking_count, 10)
      const guests = parseInt(row.total_guests, 10)
      if (existing) {
        existing.event_bookings += bookings
        existing.event_guests += guests
      } else {
        byLocation.set(row.location, {
          location: row.location,
          activity_count: 0,
          daily_capacity: 0,
          period_capacity: 0,
          total_reserved: 0,
          reservation_count: 0,
          available: 0,
          occupancy_percent: 0,
          event_bookings: bookings,
          event_guests: guests,
        })
      }
    }

    const locations = [...byLocation.values()].sort(
      (a, b) => b.occupancy_percent - a.occupancy_percent
    )

    const totalPeriodCapacity = locations.reduce(
      (sum, item) => sum + item.period_capacity,
      0
    )
    const totalReserved = locations.reduce(
      (sum, item) => sum + item.total_reserved,
      0
    )

    const capacityLocations = locations.filter(
      (item) => item.period_capacity > 0
    )

    return {
      period_start: startDate,
      period_end: endDate,
      period_days: periodDays,
      locations,
      summary: {
        most_used:
          capacityLocations.length > 0
            ? capacityLocations[0].location
            : null,
        least_used:
          capacityLocations.length > 0
            ? capacityLocations[capacityLocations.length - 1].location
            : null,
        total_period_capacity: totalPeriodCapacity,
        total_reserved: totalReserved,
        overall_occupancy_percent:
          totalPeriodCapacity > 0
            ? Math.round((totalReserved / totalPeriodCapacity) * 100)
            : 0,
      },
    }
  }

  /**
   * Dashboard summary stats for the admin panel.
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    const [users, totalActivities, today, revenue, pending] = await Promise.all([
      ReportQuery.countUsers(),
      ReportQuery.countActiveActivities(),
      ReportQuery.getTodayReservations(),
      ReportQuery.getMonthRevenue(),
      ReportQuery.countPendingPayments(),
    ])

    return {
      total_users: users.total_users,
      active_users: users.active_users,
      total_activities: totalActivities,
      reservations_today: today.reservations_today,
      aforo_today: today.aforo_today,
      global_capacity: GLOBAL_CAPACITY,
      occupancy_percent: Math.round((today.aforo_today / GLOBAL_CAPACITY) * 100),
      revenue_this_month: revenue,
      pending_payments: pending,
    }
  }

  /**
   * Day resume: global aforo, per-activity occupancy with attendee list,
   * status breakdown and event bookings for a single date.
   */
  static async getDaily(date: string): Promise<DailyReport> {
    assertValidDate(date, 'date')

    const [activityRows, attendeeRows, statusRows, eventRows, totalAforo] =
      await Promise.all([
        ReportQuery.getDailyActivities(date),
        ReportQuery.getDailyAttendees(date),
        ReportQuery.getDailyStatusBreakdown(date),
        ReportQuery.getDailyEvents(date),
        ReportQuery.getDailyGlobalAforo(date),
      ])

    const attendeesByActivity = new Map<string, DailyAttendee[]>()
    for (const row of attendeeRows) {
      const list = attendeesByActivity.get(row.activity_id) ?? []
      list.push({
        reservation_id: row.reservation_id,
        user_id: row.user_id,
        user_name: row.user_name,
        user_ci: row.user_ci,
        user_type: row.user_type,
        company_name: row.company_name,
        quantity: row.quantity,
        status: row.status,
        attended_at: toDateString(row.attended_at),
        created_by_name: row.created_by_name,
      })
      attendeesByActivity.set(row.activity_id, list)
    }

    const reservationsByStatus: Record<string, number> = {}
    let corporateReservations = 0
    let externalReservations = 0
    for (const row of statusRows) {
      reservationsByStatus[row.status] = parseInt(row.count, 10)
      corporateReservations += parseInt(row.corporate_count, 10)
      externalReservations += parseInt(row.external_count, 10)
    }

    const activities: DailyActivityReport[] = activityRows.map((row) => {
      const totalReserved = parseInt(row.total_reserved, 10)
      return {
        activity_id: row.activity_id,
        activity_name: row.activity_name,
        category_name: row.category_name,
        location: row.location,
        capacity: row.capacity,
        total_reserved: totalReserved,
        available: Math.max(row.capacity - totalReserved, 0),
        occupancy_percent:
          row.capacity > 0
            ? Math.round((totalReserved / row.capacity) * 100)
            : 0,
        reservation_count: parseInt(row.reservation_count, 10),
        no_show_count: parseInt(row.no_show_count, 10),
        attendees: attendeesByActivity.get(row.activity_id) ?? [],
      }
    })

    const events: DailyEventReport[] = eventRows.map((row) => ({
      id: row.id,
      event_name: row.event_name,
      location: row.location,
      user_name: row.user_name,
      user_ci: row.user_ci,
      guest_count: row.guest_count,
      status: row.status,
      total_price_cup: Number(row.total_price_cup),
      payment_status: row.payment_status,
    }))

    return {
      date,
      global_capacity: GLOBAL_CAPACITY,
      total_aforo: totalAforo,
      occupancy_percent: Math.round((totalAforo / GLOBAL_CAPACITY) * 100),
      reservations_by_status: reservationsByStatus,
      corporate_reservations: corporateReservations,
      external_reservations: externalReservations,
      activities,
      events,
    }
  }

  /**
   * Executive summary report combining financial, user growth, precarga
   * conversion, reservation outcomes, capacity and top rankings.
   */
  static async getGeneralReport(
    startDate: string,
    endDate: string
  ): Promise<GeneralReport> {
    const periodDays = resolvePeriodDays(startDate, endDate)

    const [scalars, byPlanRows, capacityReport, topActivities, topCompanies] =
      await Promise.all([
        ReportQuery.getGeneralScalars(startDate, endDate),
        ReportQuery.getRevenueByPlan(startDate, endDate),
        ReportService.getCapacityByLocation(startDate, endDate),
        ReportQuery.getTopActivities(startDate, endDate, 5),
        ReportQuery.getTopCompanies(startDate, endDate, 5),
      ])

    const n = (value: string): number => parseInt(value, 10)

    const payments: RevenueReport = {
      total_cup: n(scalars.payment_total_cup),
      subscription_count: n(scalars.subscription_count),
      per_visit_count: n(scalars.per_visit_count),
      by_plan: byPlanRows.map((row) => ({
        plan_name: row.plan_name,
        duration_months: parseInt(row.duration_months, 10),
        count: parseInt(row.count, 10),
        total_cup: parseInt(row.total_cup, 10),
      })),
      period_start: startDate,
      period_end: endDate,
    }

    const precargaTotal = n(scalars.precarga_total)
    const precargaActivated = n(scalars.precarga_activated)
    const totalReservations = n(scalars.reservations_total)
    const noShow = n(scalars.reservations_no_show)
    const cancelled = n(scalars.reservations_cancelled)

    return {
      period_start: startDate,
      period_end: endDate,
      period_days: periodDays,
      financial: {
        payments,
        events: {
          total_bookings: n(scalars.events_total),
          confirmed_bookings: n(scalars.events_confirmed),
          cancelled_bookings: n(scalars.events_cancelled),
          pending_payment_bookings: n(scalars.events_pending_payment),
          contract_value_cup: n(scalars.events_contract_value),
        },
      },
      users: {
        new_total: n(scalars.new_users),
        new_corporate: n(scalars.new_corporate),
        new_external: n(scalars.new_external),
        currently_suspended: n(scalars.suspended_users),
        pending_payments: n(scalars.pending_payments),
      },
      precarga: {
        total: precargaTotal,
        activated: precargaActivated,
        pending: n(scalars.precarga_pending),
        rejected: n(scalars.precarga_rejected),
        conversion_percent:
          precargaTotal > 0
            ? Math.round((precargaActivated / precargaTotal) * 100)
            : 0,
      },
      reservations: {
        total: totalReservations,
        completed: n(scalars.reservations_completed),
        cancelled,
        no_show: noShow,
        no_show_percent:
          totalReservations > 0
            ? Math.round((noShow / totalReservations) * 100)
            : 0,
        cancelled_percent:
          totalReservations > 0
            ? Math.round((cancelled / totalReservations) * 100)
            : 0,
      },
      capacity: {
        total_period_capacity: capacityReport.summary.total_period_capacity,
        total_reserved: capacityReport.summary.total_reserved,
        overall_occupancy_percent:
          capacityReport.summary.overall_occupancy_percent,
      },
      top_activities: topActivities.map((row) => ({
        activity_id: row.activity_id,
        activity_name: row.activity_name,
        total_reserved: parseInt(row.total_reserved, 10),
        reservation_count: parseInt(row.reservation_count, 10),
      })),
      top_companies: topCompanies.map((row) => ({
        company_id: row.company_id,
        company_name: row.company_name,
        total_reserved: parseInt(row.total_reserved, 10),
        active_members: parseInt(row.active_members, 10),
      })),
    }
  }
}
