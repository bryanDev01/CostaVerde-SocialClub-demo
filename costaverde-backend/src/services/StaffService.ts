import { UserQuery, type StaffAccount } from '../db/queries/users.js'
import { RoleQuery } from '../db/queries/roles.js'
import { hashPassword } from '../utils/password.js'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js'
import type { UserStatus } from '../types/user.js'

export interface CreateStaffPayload {
  name: string
  ci: string
  email: string
  password: string
  role_id: string
}

export interface UpdateStaffPayload {
  role_id?: string
  user_status?: UserStatus
  password?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const STAFF_STATUSES: ReadonlySet<UserStatus> = new Set(['active', 'inactive'])

async function resolveStaffRole(roleId: string) {
  if (!roleId) throw new ValidationError('Selecciona un rol')
  const role = await RoleQuery.getById(roleId)
  if (!role) throw new NotFoundError('Rol no encontrado')
  if (role.name === 'user') {
    throw new ValidationError('Las cuentas de socio no se crean desde este panel')
  }
  return role
}

export class StaffService {
  static async list(): Promise<StaffAccount[]> {
    return UserQuery.listStaff()
  }

  static async create(payload: CreateStaffPayload): Promise<StaffAccount> {
    const name = (payload.name ?? '').trim()
    const ci = (payload.ci ?? '').trim()
    const email = (payload.email ?? '').trim().toLowerCase()
    const password = payload.password ?? ''

    if (name.length < 3 || name.length > 150) {
      throw new ValidationError('El nombre debe tener entre 3 y 150 caracteres')
    }
    if (ci.length < 3 || ci.length > 20) {
      throw new ValidationError('El CI debe tener entre 3 y 20 caracteres')
    }
    if (!EMAIL_PATTERN.test(email)) {
      throw new ValidationError('Correo electrónico no válido')
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
    }
    const role = await resolveStaffRole(payload.role_id)

    let created
    try {
      created = await UserQuery.create({
        ci,
        email,
        name,
        password_hash: await hashPassword(password),
        user_type: 'corporate',
        user_status: 'active',
        role_id: role.id,
      })
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictError('Ya existe una cuenta con ese CI o correo electrónico')
      }
      throw error
    }

    return {
      id: created.id,
      ci: created.ci,
      email: created.email,
      name: created.name,
      user_status: created.user_status,
      role_id: created.role_id,
      role_name: role.name,
      created_at: created.created_at,
    }
  }

  static async update(
    id: string,
    payload: UpdateStaffPayload,
    actorId: string
  ): Promise<StaffAccount> {
    if (id === actorId) {
      throw new ForbiddenError('No puedes modificar tu propia cuenta desde este panel')
    }
    const account = await UserQuery.getProfileById(id)
    if (!account) throw new NotFoundError('Cuenta no encontrada')

    const nextStatus = payload.user_status
    if (nextStatus !== undefined && !STAFF_STATUSES.has(nextStatus)) {
      throw new ValidationError('Estado no válido para una cuenta interna')
    }

    if (payload.role_id !== undefined) {
      await resolveStaffRole(payload.role_id)
    }

    if (account.role_name === 'admin') {
      const demoting = payload.role_id !== undefined && payload.role_id !== account.id
      const deactivating = nextStatus === 'inactive'
      if (demoting || deactivating) {
        const others = await UserQuery.countActiveAdmins(id)
        if (others === 0) {
          throw new ValidationError('Debe quedar al menos un administrador activo')
        }
      }
    }

    let passwordHash: string | undefined
    if (payload.password !== undefined) {
      if (payload.password.length < MIN_PASSWORD_LENGTH) {
        throw new ValidationError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
      }
      passwordHash = await hashPassword(payload.password)
    }

    const updated = await UserQuery.updateStaffAccount(id, {
      role_id: payload.role_id,
      user_status: nextStatus,
      password_hash: passwordHash,
    })
    if (!updated) throw new NotFoundError('Cuenta no encontrada')
    return updated
  }
}
