import { Router, type Request, type Response, type NextFunction } from 'express'
import { authenticate, getAuthenticatedUser } from '../../middleware/auth.js'
import { requirePermission } from '../../middleware/authGuard.js'
import { UserService } from '../../services/UserService.js'
import { UserQuery } from '../../db/queries/users.js'
import { AuditQuery } from '../../db/queries/audit.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js'
import type { UserStatus, UserType } from '../../types/user.js'

const VALID_USER_STATUSES: ReadonlySet<UserStatus> = new Set([
  'pending_activation', 'pending_payment', 'active', 'suspended', 'inactive', 'external_active',
])

const VALID_USER_TYPES: ReadonlySet<UserType> = new Set([
  'corporate', 'external',
])

function parseUserStatus(value: string | undefined): UserStatus | undefined {
  if (!value) return undefined
  if (!VALID_USER_STATUSES.has(value as UserStatus)) {
    throw new ValidationError(`Invalid status: ${value}`)
  }
  return value as UserStatus
}

function parseUserType(value: string | undefined): UserType | undefined {
  if (!value) return undefined
  if (!VALID_USER_TYPES.has(value as UserType)) {
    throw new ValidationError(`Invalid user_type: ${value}`)
  }
  return value as UserType
}

export const adminUsersRouter = Router()

/**
 * GET /api/admin/users
 * List all users with optional filters.
 * Query params: status, user_type, search (CI/name/email), page, limit
 */
adminUsersRouter.get('/', authenticate, requirePermission('users'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, user_type, search, page, limit } = req.query as {
      status?: string
      user_type?: string
      search?: string
      page?: string
      limit?: string
    }

    const users = await UserService.listForAdmin({
      status: parseUserStatus(status),
      user_type: parseUserType(user_type),
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })

    res.json({
      success: true,
      data: users,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/admin/users/:id/status
 * Manually change a user's status (suspend/activate).
 * Body: { status: UserStatus }
 */
adminUsersRouter.put('/:id/status', authenticate, requirePermission('users'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status?: string }
    if (!status) {
      throw new ValidationError('status is required')
    }

    const actor = getAuthenticatedUser(req)
    const targetId = req.params.id as string
    if (targetId === actor.userId) {
      throw new ForbiddenError('Cannot change your own account status')
    }
    // Staff accounts (admin, HR, reception, internal roles) are managed in the Staff section.
    const target = await UserQuery.getProfileById(targetId)
    if (!target) {
      throw new NotFoundError('User not found')
    }
    if ((target.role_name ?? 'user') !== 'user') {
      throw new ForbiddenError('Staff account status cannot be changed here')
    }

    const nextStatus = parseUserStatus(status)!
    // Activating an account lets someone use the club without a validated payment.
    // Suspending is operational, so the `users` permission is enough for it.
    const isActivation = nextStatus === 'active' || nextStatus === 'external_active'
    if (isActivation && actor.role !== 'admin') {
      throw new ForbiddenError('Only administrators can activate accounts')
    }

    const user = await UserService.updateStatus(targetId, nextStatus)

    await AuditQuery.log({
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: 'user.status_changed',
      targetType: 'user',
      targetId,
      details: { from: target.user_status, to: nextStatus, target_ci: target.ci },
    })
    res.json({
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})
