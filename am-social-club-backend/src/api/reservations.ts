import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate, getAuthenticatedUser } from '../middleware/auth.js'
import { requireActive, requireSubscription } from '../middleware/stateValidator.js'
import { ReservationService } from '../services/ReservationService.js'

const STAFF_ROLES = ['admin', 'receptionist'] as const

export const reservationsRouter = Router()

reservationsRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const reservations = await ReservationService.listByUser(actor.userId)
    res.json({
      success: true,
      data: reservations,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

reservationsRouter.get('/active', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const reservations = await ReservationService.listActiveByUser(actor.userId)
    res.json({
      success: true,
      data: reservations,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

reservationsRouter.get('/all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    if (!STAFF_ROLES.includes(actor.role as typeof STAFF_ROLES[number])) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        timestamp: new Date().toISOString(),
      })
      return
    }
    const reservations = await ReservationService.getAllWithDetails()
    res.json({
      success: true,
      data: reservations,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

reservationsRouter.get('/check', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const { activity_id, reservation_date, quantity } = req.query as Record<string, string>
    if (!activity_id || !reservation_date || !quantity) {
      res.status(400).json({
        success: false,
        error: 'activity_id, reservation_date, and quantity are required',
        timestamp: new Date().toISOString(),
      })
      return
    }
    const parsedQuantity = parseInt(quantity, 10)
    if (!parsedQuantity || parsedQuantity < 1) {
      res.status(400).json({
        success: false,
        error: 'quantity must be at least 1',
        timestamp: new Date().toISOString(),
      })
      return
    }
    const result = await ReservationService.checkAvailability(
      activity_id,
      reservation_date,
      parsedQuantity,
      actor.userId
    )
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

reservationsRouter.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const reservation = await ReservationService.getById(req.params.id as string)

    if (reservation.user_id !== actor.userId && !STAFF_ROLES.includes(actor.role as typeof STAFF_ROLES[number])) {
      res.status(403).json({
        success: false,
        error: 'Cannot view another user\'s reservation',
        timestamp: new Date().toISOString(),
      })
      return
    }

    res.json({
      success: true,
      data: reservation,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

reservationsRouter.post('/', authenticate, requireActive(), requireSubscription(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    // Never trust client-provided audit fields; the creator is the actor.
    const { created_by_user_id: _ignored, ...body } = req.body as Record<string, unknown>
    const reservation = await ReservationService.create(
      { ...(body as object), user_id: actor.userId } as Parameters<typeof ReservationService.create>[0],
      actor.role
    )
    res.status(201).json({
      success: true,
      data: reservation,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

// Reception reserves nothing on behalf of visitors: externals pay at the door
// and only count toward the global daily capacity. See /api/reception/visitors.

reservationsRouter.post('/:id/cancel', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const cancelled = await ReservationService.cancel(req.params.id as string, actor.userId, actor.role)
    res.json({
      success: true,
      data: cancelled,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

reservationsRouter.post('/:id/confirm', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const confirmed = await ReservationService.confirmAttendance(req.params.id as string, actor.userId)
    res.json({
      success: true,
      data: confirmed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

reservationsRouter.post('/:id/no-show', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    if (!STAFF_ROLES.includes(actor.role as typeof STAFF_ROLES[number])) {
      res.status(403).json({
        success: false,
        error: 'Only admin or receptionist can mark no-show',
        timestamp: new Date().toISOString(),
      })
      return
    }
    const noShow = await ReservationService.markNoShow(req.params.id as string)
    res.json({
      success: true,
      data: noShow,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
