import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { requireRole } from '../../middleware/authGuard.js'
import { PaymentService } from '../../services/PaymentService.js'

export const adminPaymentsRouter = Router()

adminPaymentsRouter.get('/', authenticate, requireRole('admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await PaymentService.getPendingPayments()
    res.json({
      success: true,
      data: payments,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

adminPaymentsRouter.get('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await PaymentService.getById(req.params.id as string)
    res.json({
      success: true,
      data: payment,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

adminPaymentsRouter.put('/:id/validate', authenticate, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await PaymentService.validatePayment(req.params.id as string)
    res.json({
      success: true,
      data: payment,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

adminPaymentsRouter.put('/:id/reject', authenticate, requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await PaymentService.rejectPayment(req.params.id as string)
    res.json({
      success: true,
      data: payment,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
