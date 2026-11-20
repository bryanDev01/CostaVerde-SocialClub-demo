import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate, getAuthenticatedUser } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/authGuard.js'
import { StaffService } from '../../services/StaffService.js'
import type { UserStatus } from '../../types/user.js'

export const adminStaffRouter = Router()

adminStaffRouter.get('/', authenticate, requireRole('admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await StaffService.list()
    res.json({
      success: true,
      data: accounts,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

adminStaffRouter.post('/', authenticate, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const account = await StaffService.create({
      name: String(req.body?.name ?? ''),
      ci: String(req.body?.ci ?? ''),
      email: String(req.body?.email ?? ''),
      password: String(req.body?.password ?? ''),
      role_id: String(req.body?.role_id ?? ''),
    })
    res.status(201).json({
      success: true,
      data: account,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

adminStaffRouter.put('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const account = await StaffService.update(
      req.params.id as string,
      {
        role_id: req.body?.role_id ? String(req.body.role_id) : undefined,
        user_status: req.body?.user_status
          ? (String(req.body.user_status) as UserStatus)
          : undefined,
        password: req.body?.password ? String(req.body.password) : undefined,
      },
      actor.userId
    )
    res.json({
      success: true,
      data: account,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
