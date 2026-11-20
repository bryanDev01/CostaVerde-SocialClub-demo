import { RoleQuery } from '../db/queries/roles.js'
import type { Role, RoleWithUsage } from '../db/queries/roles.js'
import {
  PERMISSIONS,
  ROLE_NAME_PATTERN,
  isPermission,
  isReservedRoleName,
  type Permission,
} from '../config/permissions.js'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js'

export interface CreateRolePayload {
  name: string
  description?: string | null
  permissions: string[]
}

export interface UpdateRolePayload {
  description?: string | null
  permissions: string[]
}

function normalizePermissions(input: unknown): Permission[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new ValidationError('Selecciona al menos un permiso')
  }
  const unique = Array.from(new Set(input))
  for (const permission of unique) {
    if (typeof permission !== 'string' || !isPermission(permission)) {
      throw new ValidationError(`Permiso no válido: ${String(permission)}`)
    }
  }
  return unique as Permission[]
}

function normalizeDescription(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  if (trimmed.length > 255) {
    throw new ValidationError('La descripción no puede superar 255 caracteres')
  }
  return trimmed.length > 0 ? trimmed : null
}

export class RoleService {
  static async list(): Promise<RoleWithUsage[]> {
    return RoleQuery.listAll()
  }

  static async create(payload: CreateRolePayload): Promise<Role> {
    const name = (payload.name ?? '').trim().toLowerCase()
    if (!ROLE_NAME_PATTERN.test(name)) {
      throw new ValidationError(
        'El nombre debe empezar por letra y usar solo minúsculas, números o guion bajo (3-32 caracteres)'
      )
    }
    if (isReservedRoleName(name)) {
      throw new ValidationError(`"${name}" es un rol del sistema y no se puede reutilizar`)
    }
    const permissions = normalizePermissions(payload.permissions)
    const existing = await RoleQuery.getByName(name)
    if (existing) {
      throw new ConflictError(`Ya existe un rol llamado "${name}"`)
    }

    try {
      return await RoleQuery.create({
        name,
        description: normalizeDescription(payload.description),
        permissions,
      })
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictError(`Ya existe un rol llamado "${name}"`)
      }
      throw error
    }
  }

  static async update(id: string, payload: UpdateRolePayload): Promise<Role> {
    const role = await RoleQuery.getById(id)
    if (!role) throw new NotFoundError('Rol no encontrado')
    if (role.is_core) {
      throw new ForbiddenError('Los roles del sistema no se pueden modificar')
    }
    const permissions = normalizePermissions(payload.permissions)
    const updated = await RoleQuery.update(id, {
      description: normalizeDescription(payload.description),
      permissions,
    })
    if (!updated) throw new NotFoundError('Rol no encontrado')
    return updated
  }

  static async remove(id: string): Promise<void> {
    const role = await RoleQuery.getById(id)
    if (!role) throw new NotFoundError('Rol no encontrado')
    if (role.is_core) {
      throw new ForbiddenError('Los roles del sistema no se pueden eliminar')
    }
    const users = await RoleQuery.countUsers(id)
    if (users > 0) {
      throw new ConflictError(
        `No se puede eliminar el rol: ${users} cuenta(s) lo tienen asignado`
      )
    }
    await RoleQuery.delete(id)
  }

  /** Permissions shown in the admin UI so it never drifts from the backend catalog. */
  static catalog(): { permissions: readonly Permission[] } {
    return { permissions: PERMISSIONS }
  }
}
