import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate, getAuthenticatedUser } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/authGuard.js'
import { VipService } from '../../services/VipService.js'

export const adminVipsRouter = Router()

/**
 * GET /api/admin/vips
 * List VIP users with optional search + status filter and pagination.
 * Query params: search, status (active|inactive|all), page, limit
 */
adminVipsRouter.get('/', authenticate, requirePermission('vips'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status, page, limit } = req.query as {
      search?: string
      status?: string
      page?: string
      limit?: string
    }
    const isActive =
      status === 'active' ? true : status === 'inactive' ? false : undefined

    const data = await VipService.list({
      search,
      isActive,
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    })
    res.json({ success: true, data, timestamp: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/admin/vips
 * Create a VIP. Body: { name, ci, partners_count }
 */
adminVipsRouter.post('/', authenticate, requirePermission('vips'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const vip = await VipService.create(req.body, actor.userId)
    res.status(201).json({ success: true, data: vip, timestamp: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/admin/vips/:id
 * Update a VIP. Body: { name?, ci?, partners_count?, is_active? }
 */
adminVipsRouter.put('/:id', authenticate, requirePermission('vips'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vip = await VipService.update(req.params.id as string, req.body)
    res.json({ success: true, data: vip, timestamp: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})
