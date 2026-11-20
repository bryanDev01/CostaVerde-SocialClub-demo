import { UserQuery } from '../db/queries/users.js'
import { env } from '../config/env.js'
import { resolvePermissions } from '../config/permissions.js'
import { EmployeeQuery } from '../db/queries/employees.js'
import { RoleQuery } from '../db/queries/roles.js'
import { CompanyQuery } from '../db/queries/companies.js'
import { verifyPassword, hashPassword } from '../utils/password.js'
import { signToken } from '../utils/jwt.js'
import { isValidEmail, isValidCI, isValidPhone } from '../utils/validators.js'
import { AuthError, ValidationError, ConflictError, NotFoundError } from '../utils/errors.js'
import { UserService } from './UserService.js'
import { NotificationService } from './NotificationService.js'
import type {
  User,
  SafeUser,
  UserRole,
  LoginPayload,
  LoginResponse,
  RegisterCorporatePayload,
  CreateExternalUserPayload,
} from '../types/user.js'

export class AuthService {
  private static async resolveRoleName(user: User): Promise<UserRole> {
    if (!user.role_id) return 'user'
    const role = await RoleQuery.getById(user.role_id)
    return (role?.name as UserRole) ?? 'user'
  }

  static async login(payload: LoginPayload): Promise<LoginResponse> {
    if (!payload.email || !payload.password) {
      throw new ValidationError('Email and password are required')
    }

    const user = await UserQuery.getByEmail(payload.email)
    if (!user || !user.password_hash) {
      throw new AuthError('Invalid credentials')
    }

    const passwordValid = await verifyPassword(payload.password, user.password_hash)
    if (!passwordValid) {
      throw new AuthError('Invalid credentials')
    }

    if (user.user_status === 'inactive') {
      throw new AuthError('Account deactivated. Contact HR.')
    }
    if (user.user_status === 'pending_activation') {
      throw new AuthError('Account not activated. Complete registration first.')
    }
    // External visitors are reception records only: they never use the app.
    if (user.user_type === 'external') {
      throw new AuthError('Invalid credentials')
    }

    const profile = await UserQuery.getProfileById(user.id)
    if (!profile) throw new NotFoundError('User profile not found')

    const role = await AuthService.resolveRoleName(user)
    profile.role_permissions = resolvePermissions(role, profile.role_permissions)
    const token = signToken({
      userId: user.id,
      email: user.email,
      role,
      userType: user.user_type,
      companyId: user.company_id,
    })

    return { user: profile, token }
  }

  static async registerCorporate(payload: RegisterCorporatePayload): Promise<SafeUser> {
    if (!isValidCI(payload.ci)) {
      throw new ValidationError('Invalid CI format. Expected 11 digits.')
    }
    if (!isValidEmail(payload.email)) {
      throw new ValidationError('Invalid email format')
    }
    if (payload.phone && !isValidPhone(payload.phone)) {
      throw new ValidationError('Invalid phone format')
    }
    if (!payload.password || payload.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters')
    }

    const existingByCI = await UserQuery.getByCI(payload.ci)
    if (existingByCI) {
      throw new ConflictError('A user with this CI already exists')
    }
    const existingByEmail = await UserQuery.getByEmail(payload.email)
    if (existingByEmail) {
      throw new ConflictError('A user with this email already exists')
    }

    const preEmployee = await EmployeeQuery.getByCI(payload.ci)
    if (!preEmployee) {
      throw new NotFoundError('CI not found in employee preload. Contact HR.')
    }
    if (preEmployee.status !== 'pending') {
      throw new ConflictError('This employee record is no longer pending activation')
    }

    // Both CI and email must match the HR preload. If HR registered an email
    // for this CI, the user cannot register with a different one.
    const normalizedEmail = payload.email.trim().toLowerCase()
    const preloadEmail = preEmployee.email?.trim().toLowerCase() ?? null
    if (preloadEmail && preloadEmail !== normalizedEmail) {
      throw new ValidationError(
        'Email does not match the one registered by HR for this CI'
      )
    }

    const userRole = await RoleQuery.getByName('user')
    if (!userRole) throw new NotFoundError('Default role not configured')

    const company = await CompanyQuery.upsertByName(preEmployee.company)

    const passwordHash = await hashPassword(payload.password)

    const user = await UserQuery.create({
      ci: payload.ci,
      email: payload.email,
      password_hash: passwordHash,
      name: preEmployee.name,
      phone: payload.phone ?? preEmployee.phone ?? undefined,
      company_id: company.id,
      user_type: 'corporate',
      user_status: 'pending_payment',
      role_id: userRole.id,
    })

    try {
      await EmployeeQuery.activate(preEmployee.ci, user.id, user.id)
    } catch (error) {
      // Compensate: don't leave an orphan user that blocks re-registration.
      await UserQuery.delete(user.id)
      throw error
    }

    await NotificationService.notifyUser(user.id, {
      type: 'account_created',
      title: `¡Bienvenido al ${env.CLUB_NAME}!`,
      message:
        'Tu cuenta fue creada. Activa tu suscripción para empezar a reservar y usar tu carnet digital.',
    })
    await NotificationService.notifyRoles(['admin', 'hr'], {
      type: 'user_registered',
      title: 'Nuevo usuario registrado',
      message: `${preEmployee.name} (CI ${preEmployee.ci}) completó su registro y está pendiente de pago.`,
    })

    return UserService.toSafeUser(user)
  }

  static async createExternalUser(
    payload: CreateExternalUserPayload,
    receptionistId: string
  ): Promise<SafeUser> {
    if (!isValidCI(payload.ci)) {
      throw new ValidationError('Invalid CI format. Expected 11 digits.')
    }
    if (!payload.name || payload.name.trim().length === 0) {
      throw new ValidationError('Name is required')
    }
    if (payload.phone && !isValidPhone(payload.phone)) {
      throw new ValidationError('Invalid phone format')
    }

    const existing = await UserQuery.getByCI(payload.ci)
    if (existing) {
      throw new ConflictError('A user with this CI already exists')
    }

    const userRole = await RoleQuery.getByName('user')
    if (!userRole) throw new NotFoundError('Default role not configured')

    const user = await UserQuery.create({
      ci: payload.ci,
      name: payload.name,
      phone: payload.phone,
      user_type: 'external',
      user_status: 'external_active',
      role_id: userRole.id,
      created_by_user_id: receptionistId,
    })

    return UserService.toSafeUser(user)
  }
}
