import { Router, type Request, type Response, type NextFunction } from 'express'
import { ActivityService } from '../services/ActivityService.js'

export const activitiesRouter = Router()

activitiesRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const activities = await ActivityService.getAll()
    res.json({
      success: true,
      data: activities,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

activitiesRouter.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await ActivityService.getCategories()
    res.json({
      success: true,
      data: categories,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

activitiesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await ActivityService.getById(req.params.id as string)
    res.json({
      success: true,
      data: activity,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
