import type { Request, Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from './auth.js'
import type { UserRole } from '../types/user.js'
import { ForbiddenError } from '../utils/errors.js'
import type { Permission } from '../config/permissions.js'

/**
 * Grants access when the user holds at least one of the capabilities. Custom
 * roles never pass name-based guards (requireRole), so they only reach routes
 * explicitly protected by a capability.
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest
    if (!authReq.user) {
      next(new ForbiddenError('Authentication required'))
      return
    }
    const granted = authReq.user.permissions ?? []
    if (!permissions.some((permission) => granted.includes(permission))) {
      next(new ForbiddenError('Insufficient permissions'))
      return
    }
    next()
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest
    if (!authReq.user) {
      next(new ForbiddenError('Authentication required'))
      return
    }
    if (!roles.includes(authReq.user.role)) {
      next(new ForbiddenError('Insufficient permissions'))
      return
    }
    next()
  }
}

export function requireUserRole(userRole: UserRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest
    if (!authReq.user) {
      next(new ForbiddenError('Authentication required'))
      return
    }
    if (authReq.user.role !== userRole) {
      next(new ForbiddenError('Insufficient permissions'))
      return
    }
    next()
  }
}
