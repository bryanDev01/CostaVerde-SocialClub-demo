import type { Request, Response, NextFunction } from 'express'
import { UserQuery } from '../db/queries/users.js'
import { SubscriptionQuery } from '../db/queries/subscriptions.js'
import type { AuthenticatedRequest } from './auth.js'
import type { UserStatus } from '../types/user.js'
import { ForbiddenError } from '../utils/errors.js'

const ACTIVE_STATUSES: UserStatus[] = ['active', 'external_active']

export function requireActive() {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest
      if (!user) {
        next(new ForbiddenError('Authentication required'))
        return
      }

      const dbUser = await UserQuery.getById(user.userId)
      if (!dbUser || !ACTIVE_STATUSES.includes(dbUser.user_status)) {
        next(new ForbiddenError('User account is not active'))
        return
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}

export function requireSubscription() {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest
      if (!user) {
        next(new ForbiddenError('Authentication required'))
        return
      }

      const dbUser = await UserQuery.getById(user.userId)
      if (!dbUser) {
        next(new ForbiddenError('User not found'))
        return
      }

      if (dbUser.user_type === 'external') {
        // External visitors do not use the app: they are registered and charged at reception.
        next(new ForbiddenError('Los visitantes externos no usan la aplicación'))
        return
      }

      const subscription = await SubscriptionQuery.getActiveByUserId(user.userId)
      if (!subscription) {
        next(new ForbiddenError('Active subscription required'))
        return
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}

export function requireStatus(...allowed: UserStatus[]) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest
      if (!user) {
        next(new ForbiddenError('Authentication required'))
        return
      }

      const dbUser = await UserQuery.getById(user.userId)
      if (!dbUser || !allowed.includes(dbUser.user_status)) {
        next(
          new ForbiddenError(
            `User status must be one of: ${allowed.join(', ')}`
          )
        )
        return
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}
