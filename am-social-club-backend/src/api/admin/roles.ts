import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/authGuard.js'
import { RoleService } from '../../services/RoleService.js'

export const adminRolesRouter = Router()

adminRolesRouter.get('/catalog', authenticate, requireRole('admin'), (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: RoleService.catalog(),
    timestamp: new Date().toISOString(),
  })
})

adminRolesRouter.get('/', authenticate, requireRole('admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await RoleService.list()
    res.json({
      success: true,
      data: roles,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

adminRolesRouter.post('/', authenticate, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = await RoleService.create({
      name: String(req.body?.name ?? ''),
      description: req.body?.description ?? null,
      permissions: req.body?.permissions ?? [],
    })
    res.status(201).json({
      success: true,
      data: role,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

adminRolesRouter.put('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = await RoleService.update(req.params.id as string, {
      description: req.body?.description ?? null,
      permissions: req.body?.permissions ?? [],
    })
    res.json({
      success: true,
      data: role,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

adminRolesRouter.delete('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await RoleService.remove(req.params.id as string)
    res.json({
      success: true,
      data: { deleted: true },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
