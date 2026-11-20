import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../middleware/auth.js'
import { getAuthenticatedUser } from '../middleware/auth.js'
import { SubscriptionService } from '../services/SubscriptionService.js'

export const subscriptionsRouter = Router()

subscriptionsRouter.get('/plans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await SubscriptionService.getPlans()
    res.json({
      success: true,
      data: plans,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

subscriptionsRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const subscription = await SubscriptionService.getByUserId(actor.userId)
    res.json({
      success: true,
      data: subscription,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
