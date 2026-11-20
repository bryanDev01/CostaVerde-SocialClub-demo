import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate, getAuthenticatedUser } from '../middleware/auth.js'
import { UserService } from '../services/UserService.js'

export const usersRouter = Router()

usersRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const profile = await UserService.getProfile(actor.userId)
    res.json({
      success: true,
      data: profile,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * Only the owner or an admin can read another user's profile.
 * Other users get 403 — no PII (email, phone, CI) enumeration.
 */
usersRouter.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const targetId = req.params.id as string
    const isSelf = actor.userId === targetId
    const isAdmin = actor.role === 'admin'

    if (!isSelf && !isAdmin) {
      res.status(403).json({
        success: false,
        error: 'You can only access your own profile',
        timestamp: new Date().toISOString(),
      })
      return
    }

    const user = await UserService.getById(targetId)
    res.json({
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

usersRouter.put('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const updated = await UserService.updateProfile(actor.userId, req.body)
    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * Upload the caller's profile photo as a base64 data URL.
 * The file is stored under /uploads/avatars and served statically.
 */
usersRouter.post('/me/photo', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getAuthenticatedUser(req)
    const updated = await UserService.updateProfilePhoto(actor.userId, req.body?.image)
    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
