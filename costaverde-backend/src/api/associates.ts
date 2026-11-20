import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate, getAuthenticatedUser } from '../middleware/auth.js'
import { requireActive } from '../middleware/stateValidator.js'
import { AssociateService } from '../services/AssociateService.js'

export const associatesRouter = Router()

associatesRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const associates = await AssociateService.listByUser(actor.userId)
    res.json({
      success: true,
      data: associates,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

associatesRouter.post('/', authenticate, requireActive(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const associate = await AssociateService.create({
      ...req.body,
      user_id: actor.userId,
    })
    res.status(201).json({
      success: true,
      data: associate,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

associatesRouter.put('/:id', authenticate, requireActive(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const updated = await AssociateService.update(req.params.id as string, actor.userId, req.body)
    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

associatesRouter.delete('/:id', authenticate, requireActive(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    await AssociateService.remove(req.params.id as string, actor.userId)
    res.json({
      success: true,
      data: { deleted: true },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
