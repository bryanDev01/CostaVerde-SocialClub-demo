import type { VisitPaymentMethod } from '../types/vip.js'
import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate, getAuthenticatedUser } from '../middleware/auth.js'
import { requirePermission } from '../middleware/authGuard.js'
import { CarnetService } from '../services/CarnetService.js'
import { VipService } from '../services/VipService.js'
import { VisitorService } from '../services/VisitorService.js'
import { ReservationQuery } from '../db/queries/reservations.js'
import { clubToday } from '../utils/helpers.js'
import { VisitQuery } from '../db/queries/visits.js'
import { pool } from '../db/connection.js'
import { env } from '../config/env.js'
import { ValidationError } from '../utils/errors.js'

interface ActivityAvailabilityRow {
  id: string
  name: string
  category_name: string
  capacity: number
  reserved_today: string
}

export const receptionRouter = Router()

/**
 * POST /api/reception/verify-carnet
 * Verify a scanned QR and return user + associates + today's reservations.
 * Body: { qr_payload: string }
 */
receptionRouter.post('/verify-carnet', authenticate, requirePermission('reception'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qr_payload } = req.body as { qr_payload?: string }
    if (!qr_payload || typeof qr_payload !== 'string') {
      throw new ValidationError('qr_payload is required and must be a string')
    }

    const verification = await CarnetService.verifyQR(qr_payload)
    if (!verification.valid || !verification.member) {
      res.json({
        success: true,
        data: verification,
        timestamp: new Date().toISOString(),
      })
      return
    }

    // Get today's reservations for this user
    const todayReservations = await ReservationQuery.getActiveByUserIdAndDate(
      verification.member.id,
      clubToday()
    )

    res.json({
      success: true,
      data: {
        ...verification,
        today_reservations: todayReservations,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/reception/vips?q=...
 * Search active VIPs by CI or name (for on-arrival verification).
 */
receptionRouter.get('/vips', authenticate, requirePermission('reception'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query as { q?: string }
    const vips = await VipService.searchForReception(q ?? '')
    res.json({ success: true, data: vips, timestamp: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/reception/vips/:id/entry
 * Verify a VIP and register their entry for today.
 */
receptionRouter.post('/vips/:id/entry', authenticate, requirePermission('reception'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const payment = req.body?.payment as
      | { amount_cup?: unknown; payment_method?: unknown; payment_reference?: string }
      | undefined
    const result = await VipService.registerEntry(
      req.params.id as string,
      actor.userId,
      payment
        ? {
            amount_cup: payment.amount_cup as number,
            payment_method: payment.payment_method as VisitPaymentMethod,
            payment_reference: payment.payment_reference ?? undefined,
          }
        : null
    )
    res.status(201).json({ success: true, data: result, timestamp: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/reception/associates?q=
 * Search corporate members to register their entrance.
 */
receptionRouter.get('/associates', authenticate, requirePermission('reception'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query as { q?: string }
    const members = await VisitorService.searchMembers(q ?? '')
    res.json({ success: true, data: members, timestamp: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/reception/associates/:id/entry
 * Register an associate entrance and its collection (one record).
 */
receptionRouter.post('/associates/:id/entry', authenticate, requirePermission('reception'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const { people, payment } = req.body as {
      people?: unknown
      payment?: { amount_cup?: unknown; payment_method?: unknown; payment_reference?: string } | null
    }
    const visit = await VisitorService.registerAssociateEntry(
      {
        user_id: req.params.id as string,
        people: people as number,
        payment: payment
          ? {
              amount_cup: payment.amount_cup as number,
              payment_method: payment.payment_method as VisitPaymentMethod,
              payment_reference: payment.payment_reference ?? undefined,
            }
          : null,
      },
      actor.userId
    )
    res.status(201).json({ success: true, data: visit, timestamp: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/reception/visitors/autocomplete
 * Search external users by CI or name for walk-in autocomplete.
 */
receptionRouter.get('/visitors/autocomplete', authenticate, requirePermission('reception'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query
    if (typeof q !== 'string') {
      res.json({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      })
      return
    }
    
    const visitors = await VisitorService.autocomplete(q)
    res.json({
      success: true,
      data: visitors,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/reception/visitors
 * Register a walk-in visitor (find-or-create external user + create visit).
 */
receptionRouter.post('/visitors', authenticate, requirePermission('reception'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const rawIdempotencyKey = req.headers['idempotency-key']
    const idempotencyKey = typeof rawIdempotencyKey === 'string' ? rawIdempotencyKey.trim() : ''
    if (idempotencyKey.length > 100) {
      throw new ValidationError('Idempotency-Key is too long')
    }
    const { ci, name, phone, partner_count, visit_date, payment } = req.body as {
      ci?: string
      name?: string
      phone?: string
      partner_count?: unknown
      visit_date?: string
      payment?: { amount_cup?: unknown; payment_method?: unknown; payment_reference?: string } | null
    }

    if (typeof partner_count !== 'number' || partner_count < 0) {
      throw new ValidationError('Partner count is required and must be >= 0')
    }

    const result = await VisitorService.registerWalkIn(
      {
        ci: ci ?? '',
        name: name ?? '',
        phone: phone ?? undefined,
        partner_count,
        visit_date: visit_date ?? undefined,
        payment: payment
          ? {
              amount_cup: payment.amount_cup as number,
              payment_method: payment.payment_method as VisitPaymentMethod,
              payment_reference: payment.payment_reference ?? undefined,
            }
          : null,
        idempotency_key: idempotencyKey || null,
      },
      actor.userId
    )
    res.status(201).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/reception/today
 * Today's occupancy and availability for reception (reservations + visits).
 */
receptionRouter.get('/today', authenticate, requirePermission('reception'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = clubToday()
    const capacity = env.GLOBAL_DAILY_CAPACITY

    const result = await pool.query(
      `SELECT
        COALESCE(SUM(r.quantity), 0) as total_today,
        COUNT(DISTINCT r.id) as reservation_count
       FROM reservations r
       JOIN activities a ON a.id = r.activity_id AND a.is_reservable = true
       WHERE r.reservation_date = $1
       AND r.status NOT IN ('cancelled', 'no_show')`,
      [today]
    )

    const activities = await pool.query(
      `SELECT
        a.id, a.name, ac.name as category_name,
        a.capacity,
        COALESCE(SUM(r.quantity) FILTER (WHERE r.reservation_date = $1 AND r.status NOT IN ('cancelled', 'no_show')), 0) as reserved_today
       FROM activities a
       LEFT JOIN activity_categories ac ON a.category_id = ac.id
       LEFT JOIN reservations r ON r.activity_id = a.id
       WHERE a.is_active = true AND a.is_reservable = true
       GROUP BY a.id, a.name, ac.name, a.capacity
       ORDER BY a.name ASC`,
      [today]
    )

    const [visitsHeadcount, visits] = await Promise.all([
      VisitQuery.countHeadcountByDate(today),
      VisitQuery.listByDate(today),
    ])

    const reservationsAforo = parseInt(result.rows[0].total_today, 10)
    const aforoToday = reservationsAforo + visitsHeadcount

    res.json({
      success: true,
      data: {
        date: today,
        global_capacity: capacity,
        total_today: aforoToday,
        reservations_aforo: reservationsAforo,
        visits_aforo: visitsHeadcount,
        remaining_today: Math.max(capacity - aforoToday, 0),
        reservation_count: parseInt(result.rows[0].reservation_count, 10),
        occupancy_percent: Math.round((aforoToday / capacity) * 100),
        activities: activities.rows.map((row: ActivityAvailabilityRow) => ({
          id: row.id,
          name: row.name,
          category_name: row.category_name,
          capacity: row.capacity,
          reserved_today: parseInt(row.reserved_today, 10),
          remaining: row.capacity - parseInt(row.reserved_today, 10),
        })),
        visits: visits.map((visit) => ({
          id: visit.id,
          kind: visit.kind,
          responsible_name: visit.responsible_name,
          responsible_ci: visit.responsible_ci,
          partner_count: visit.partner_count,
          headcount: visit.partner_count + 1,
          amount_cup: visit.amount_cup ?? null,
          payment_method: visit.payment_method ?? null,
          created_by_name: visit.created_by_name ?? null,
          created_at: visit.created_at,
        })),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
