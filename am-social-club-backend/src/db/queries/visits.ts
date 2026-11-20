import { pool } from '../connection.js'
import { env } from '../../config/env.js'
import { ConflictError } from '../../utils/errors.js'
import type { Visit, VisitKind, VisitPaymentInput } from '../../types/vip.js'

export interface CreateVisitPayload {
  kind: VisitKind
  vip_id?: string | null
  responsible_user_id?: string | null
  responsible_name: string
  responsible_ci?: string | null
  partner_count: number
  visit_date: string
  created_by_user_id?: string | null
  payment?: VisitPaymentInput | null
  /** Optional key so a retried request returns the original visit instead of creating another. */
  idempotency_key?: string | null
  /** false when the person is already counted by a reservation that day. */
  counts_aforo?: boolean
}

export interface VisitRow extends Visit {
  created_by_name?: string | null
}

export interface ExternalPaymentRow {
  id: string
  kind: VisitKind
  visit_date: string
  responsible_name: string
  responsible_ci: string | null
  partner_count: number
  amount_cup: number
  payment_method: string
  payment_reference: string | null
  paid_at: Date
  registered_by_name: string | null
}

/** Totals of collections: visits = groups charged, people = leader + partners. */
export interface ExternalPaymentTotals {
  visits: number
  people: number
  amount_cup: number
}

export interface ExternalPaymentSummary {
  totals: ExternalPaymentTotals
  by_kind: Record<VisitKind, ExternalPaymentTotals>
}

export class VisitQuery {
  /**
   * Register a visit inside the global daily cap. Uses the same advisory lock
   * as reservations so visits and reservations cannot overbook the day.
   */
  static async create(payload: CreateVisitPayload): Promise<Visit> {
    const payment = payload.payment ?? null
    const headcount = payload.partner_count + 1

    // A retried submission with the same key returns the original visit and
    // never creates a second collection.
    if (payload.idempotency_key) {
      const existing = await VisitQuery.getByIdempotencyKey(payload.idempotency_key)
      if (existing) return existing
    }

    const client = await pool.connect()

    try {
      await client.query('BEGIN')
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `aforo:${payload.visit_date}`,
      ])

      const totals = await client.query(
        `SELECT
           (SELECT COALESCE(SUM(quantity), 0) FROM reservations
            WHERE reservation_date = $1 AND status NOT IN ('cancelled', 'no_show')) AS reservations_total,
           (SELECT COALESCE(SUM(partner_count + 1), 0) FROM visits
            WHERE visit_date = $1 AND counts_aforo = true) AS visits_total`,
        [payload.visit_date]
      )
      const used =
        parseInt(totals.rows[0].reservations_total as string, 10) +
        parseInt(totals.rows[0].visits_total as string, 10)
      if (used + headcount > env.GLOBAL_DAILY_CAPACITY) {
        throw new ConflictError('Global daily capacity exceeded')
      }

      const result = await client.query<Visit>(
        `INSERT INTO visits
          (kind, vip_id, responsible_user_id, responsible_name, responsible_ci,
           partner_count, visit_date, created_by_user_id,
           amount_cup, payment_method, payment_reference, paid_at, paid_by_user_id,
           idempotency_key, counts_aforo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                 CASE WHEN $9::int IS NULL THEN NULL ELSE NOW() END,
                 CASE WHEN $9::int IS NULL THEN NULL ELSE $8::uuid END,
                 $12, $13)
         RETURNING *`,
        [
          payload.kind,
          payload.vip_id ?? null,
          payload.responsible_user_id ?? null,
          payload.responsible_name,
          payload.responsible_ci ?? null,
          payload.partner_count,
          payload.visit_date,
          payload.created_by_user_id ?? null,
          payment?.amount_cup ?? null,
          payment?.payment_method ?? null,
          payment?.payment_reference ?? null,
          payload.idempotency_key ?? null,
          payload.counts_aforo ?? true,
        ]
      )

      await client.query('COMMIT')
      return result.rows[0]
    } catch (error) {
      await client.query('ROLLBACK')
      const pgError = error as { code?: string; constraint?: string }
      // Concurrent duplicate with the same key: return the original visit.
      if (
        pgError.code === '23505' &&
        pgError.constraint === 'uq_visits_idempotency_key' &&
        payload.idempotency_key
      ) {
        const existing = await VisitQuery.getByIdempotencyKey(payload.idempotency_key)
        if (existing) return existing
      }
      if (pgError.code === '23505') {
        throw new ConflictError('This VIP already registered an entry today')
      }
      throw error
    } finally {
      client.release()
    }
  }

  /** Returns the visit created for a given idempotency key, if any. */
  static async getByIdempotencyKey(key: string): Promise<Visit | null> {
    const result = await pool.query<Visit>(
      'SELECT * FROM visits WHERE idempotency_key = $1',
      [key]
    )
    return result.rows[0] ?? null
  }

  static async listByDate(date: string): Promise<VisitRow[]> {
    const result = await pool.query<VisitRow>(
      `SELECT v.*, creator.name AS created_by_name
       FROM visits v
       LEFT JOIN users creator ON creator.id = v.created_by_user_id
       WHERE v.visit_date = $1::date
       ORDER BY v.created_at ASC`,
      [date]
    )
    return result.rows
  }

  /** Total people (responsible + partners) recorded for a given day. */
  static async countHeadcountByDate(date: string): Promise<number> {
    const result = await pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(partner_count + 1), 0) AS total
       FROM visits
       WHERE visit_date = $1::date AND counts_aforo = true`,
      [date]
    )
    return parseInt(result.rows[0].total, 10)
  }

  /** Whether this VIP already has an entry on the given day. */
  static async hasAssociateEntryToday(userId: string, date: string): Promise<boolean> {
    const result = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM visits
         WHERE kind = 'associate' AND responsible_user_id = $1
           AND visit_date = $2::date
       ) AS exists`,
      [userId, date]
    )
    return result.rows[0].exists
  }

  /** Whether this VIP already has an entry on the given day. */
  static async hasEntryToday(vipId: string, date: string): Promise<boolean> {
    const result = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM visits
         WHERE vip_id = $1 AND visit_date = $2::date
       ) AS exists`,
      [vipId, date]
    )
    return result.rows[0].exists
  }

  /** Collections recorded at reception within a date range (inclusive). */
  static async listPaidByRange(from: string, to: string): Promise<ExternalPaymentRow[]> {
    const result = await pool.query<ExternalPaymentRow>(
      `SELECT v.id, v.kind, v.visit_date::text AS visit_date, v.responsible_name, v.responsible_ci,
              v.partner_count, v.amount_cup, v.payment_method, v.payment_reference,
              v.paid_at, reg.name AS registered_by_name
       FROM visits v
       LEFT JOIN users reg ON reg.id = v.created_by_user_id
       WHERE v.amount_cup IS NOT NULL
         AND v.visit_date BETWEEN $1::date AND $2::date
       ORDER BY v.visit_date DESC, v.paid_at DESC`,
      [from, to]
    )
    return result.rows
  }

  /** Totals for the range, overall and split by kind (walk_in = externo, vip = VIP). */
  static async sumPaidByRange(from: string, to: string): Promise<ExternalPaymentSummary> {
    const result = await pool.query<{ kind: VisitKind; visits: string; people: string; amount_cup: string }>(
      `SELECT kind,
              COUNT(*)::text AS visits,
              COALESCE(SUM(partner_count + 1), 0)::text AS people,
              COALESCE(SUM(amount_cup), 0)::text AS amount_cup
       FROM visits
       WHERE amount_cup IS NOT NULL
         AND visit_date BETWEEN $1::date AND $2::date
       GROUP BY kind`,
      [from, to]
    )

    const by_kind: Record<VisitKind, ExternalPaymentTotals> = {
      walk_in: { visits: 0, people: 0, amount_cup: 0 },
      vip: { visits: 0, people: 0, amount_cup: 0 },
      associate: { visits: 0, people: 0, amount_cup: 0 },
    }
    for (const row of result.rows) {
      by_kind[row.kind] = {
        visits: parseInt(row.visits, 10),
        people: parseInt(row.people, 10),
        amount_cup: parseInt(row.amount_cup, 10),
      }
    }

    const totals: ExternalPaymentTotals = {
      visits: by_kind.walk_in.visits + by_kind.vip.visits,
      people: by_kind.walk_in.people + by_kind.vip.people,
      amount_cup: by_kind.walk_in.amount_cup + by_kind.vip.amount_cup,
    }
    return { totals, by_kind }
  }
}
