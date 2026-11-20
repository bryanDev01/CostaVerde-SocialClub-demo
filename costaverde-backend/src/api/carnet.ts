import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate, getAuthenticatedUser } from '../middleware/auth.js'
import { requireRole } from '../middleware/authGuard.js'
import { CarnetService } from '../services/CarnetService.js'
import { ValidationError } from '../utils/errors.js'

export const carnetRouter = Router()

/**
 * GET /api/carnet/me
 * Returns the user's carnet, auto-creating if it doesn't exist.
 */
carnetRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const carnet = await CarnetService.getOrCreate(actor.userId)
    res.json({
      success: true,
      data: carnet,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/carnet/verify
 * Verify a scanned QR code (admin/receptionist only).
 * Body: { qr_payload: string }
 */
carnetRouter.post(
  '/verify',
  authenticate,
  requireRole('admin', 'receptionist'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { qr_payload } = req.body as { qr_payload?: string }
      if (!qr_payload || typeof qr_payload !== 'string') {
        throw new ValidationError('qr_payload is required and must be a string')
      }

      const result = await CarnetService.verifyQR(qr_payload)
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      next(error)
    }
  }
)
