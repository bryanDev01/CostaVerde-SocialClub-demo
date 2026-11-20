import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate, getAuthenticatedUser } from '../middleware/auth.js'
import { NotificationService } from '../services/NotificationService.js'

export const notificationsRouter = Router()

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/**
 * GET /api/notifications
 * Current user's notifications (newest first) + unread count.
 * Query params: unread_only=true, limit, offset
 */
notificationsRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const { unread_only, limit, offset } = req.query as {
      unread_only?: string
      limit?: string
      offset?: string
    }

    const [notifications, unreadCount] = await Promise.all([
      NotificationService.listForUser(actor.userId, {
        unreadOnly: unread_only === 'true',
        limit: parsePositiveInt(limit),
        offset: parsePositiveInt(offset),
      }),
      NotificationService.unreadCount(actor.userId),
    ])

    res.json({
      success: true,
      data: { notifications, unread_count: unreadCount },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/notifications/unread-count
 */
notificationsRouter.get('/unread-count', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const count = await NotificationService.unreadCount(actor.userId)
    res.json({
      success: true,
      data: { unread_count: count },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/notifications/read-all
 */
notificationsRouter.put('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const updated = await NotificationService.markAllRead(actor.userId)
    res.json({
      success: true,
      data: { updated },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/notifications/:id/read
 */
notificationsRouter.put('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const ok = await NotificationService.markRead(req.params.id as string, actor.userId)
    res.json({
      success: true,
      data: { updated: ok },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /api/notifications/:id
 * Removes one notification from the current user's list only.
 */
notificationsRouter.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const deleted = await NotificationService.delete(req.params.id as string, actor.userId)
    res.json({
      success: true,
      data: { deleted },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
