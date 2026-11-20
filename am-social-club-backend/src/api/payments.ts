import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate, getAuthenticatedUser } from '../middleware/auth.js'
import { requireStatus } from '../middleware/stateValidator.js'
import { PaymentService } from '../services/PaymentService.js'

export const paymentsRouter = Router()

paymentsRouter.post('/intent', authenticate, requireStatus('pending_payment', 'suspended', 'active', 'external_active'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const { plan_id } = req.body as { plan_id?: string }
    if (!plan_id) {
      res.status(400).json({
        success: false,
        error: 'plan_id is required',
        timestamp: new Date().toISOString(),
      })
      return
    }
    const result = await PaymentService.createSubscriptionIntent(actor.userId, plan_id)
    res.status(201).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

paymentsRouter.post('/confirm', authenticate, requireStatus('pending_payment', 'suspended', 'active', 'external_active'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const { payment_id, transaction_number } = req.body as {
      payment_id?: string
      transaction_number?: string
    }
    if (!payment_id || !transaction_number) {
      res.status(400).json({
        success: false,
        error: 'payment_id and transaction_number are required',
        timestamp: new Date().toISOString(),
      })
      return
    }
    const payment = await PaymentService.confirmTransaction(
      payment_id,
      transaction_number,
      actor.userId
    )
    res.json({
      success: true,
      data: payment,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

// Per-visit payments are no longer made in the app. External visitors never
// use the app; reception collects the payment and records it on the visit
// (POST /api/reception/visitors, admin view GET /api/admin/external-payments).
paymentsRouter.post('/per-visit', authenticate, (_req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    error: 'Los pagos de visitantes externos se cobran en recepción y no se registran en la aplicación.',
    timestamp: new Date().toISOString(),
  })
})

paymentsRouter.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const payment = await PaymentService.getById(req.params.id as string)

    if (payment.user_id !== actor.userId && actor.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Cannot view another user\'s payment',
        timestamp: new Date().toISOString(),
      })
      return
    }

    res.json({
      success: true,
      data: payment,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
