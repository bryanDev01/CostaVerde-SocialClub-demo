import { Router, type Request, type Response, type NextFunction } from 'express'
import { AuthService } from '../services/AuthService.js'
import { PasswordResetService } from '../services/PasswordResetService.js'
import { authLimiter } from '../middleware/rateLimiter.js'
import { loginLockout, recordLoginFailure, recordLoginSuccess } from '../middleware/authLockout.js'
import { authenticate } from '../middleware/auth.js'
import { getAuthenticatedUser } from '../middleware/auth.js'
import { ForbiddenError, AuthError } from '../utils/errors.js'

export const authRouter = Router()

authRouter.post(
  '/login',
  authLimiter,
  loginLockout,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await AuthService.login(req.body)
      recordLoginSuccess(req)
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      if (error instanceof AuthError && error.message === 'Invalid credentials') {
        recordLoginFailure(req)
      }
      next(error)
    }
  }
)

authRouter.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await AuthService.registerCorporate(req.body)
    res.status(201).json({
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/auth/forgot-password
 * Request a password reset link. Always succeeds to avoid user enumeration.
 * Body: { email: string }
 */
authRouter.post('/forgot-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body as { email?: string }
    const result = await PasswordResetService.requestReset(email)
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/auth/reset-password/validate?token=...
 * Check whether a reset token is still valid (used before showing the form).
 */
authRouter.get('/reset-password/validate', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query as { token?: string }
    const valid = await PasswordResetService.validateToken(token)
    res.json({
      success: true,
      data: { valid },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/auth/reset-password
 * Consume a reset token and set a new password.
 * Body: { token: string, password: string }
 */
authRouter.post('/reset-password', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string }
    await PasswordResetService.resetPassword(token, password)
    res.json({
      success: true,
      data: { reset: true },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/external', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    if (actor.role !== 'admin' && actor.role !== 'receptionist') {
      throw new ForbiddenError('Only admin or receptionist can create external users')
    }
    const user = await AuthService.createExternalUser(req.body, actor.userId)
    res.status(201).json({
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
