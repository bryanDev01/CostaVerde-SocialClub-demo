import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt.js'
import { UserQuery } from '../db/queries/users.js'
import type { JwtPayload } from '../types/user.js'
import { AuthError } from '../utils/errors.js'
import { resolvePermissions } from '../config/permissions.js'

export interface AuthenticatedRequest extends Request {
  user: JwtPayload
}

function extractToken(req: Request): string {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing authorization token')
  }
  return authHeader.split(' ')[1]
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req)
    const payload = verifyToken(token)

    // Revalidate identity, role and status against the database on every
    // request so revoked users or demoted roles cannot use stale tokens.
    const profile = await UserQuery.getProfileById(payload.userId)
    if (!profile) {
      throw new AuthError('User no longer exists')
    }
    // A deactivated account must lose access to every endpoint, not only to reservations.
    if (profile.user_status === 'inactive') {
      throw new AuthError('Account deactivated. Contact HR.')
    }
    // External visitors are reception records only: they never use the app.
    if (profile.user_type === 'external') {
      throw new AuthError('External visitors do not have access')
    }

    const roleName = profile.role_name ?? 'user'
    const freshPayload: JwtPayload = {
      userId: profile.id,
      email: profile.email,
      role: roleName,
      permissions: resolvePermissions(roleName, profile.role_permissions),
      userType: profile.user_type,
      companyId: profile.company_id,
    }
    ;(req as AuthenticatedRequest).user = freshPayload
    next()
  } catch (error) {
    if (error instanceof AuthError) {
      next(error)
    } else {
      next(new AuthError('Invalid or expired token'))
    }
  }
}

export function getAuthenticatedUser(req: Request): JwtPayload {
  const authReq = req as AuthenticatedRequest
  if (!authReq.user) {
    throw new AuthError('Authentication required')
  }
  return authReq.user
}
