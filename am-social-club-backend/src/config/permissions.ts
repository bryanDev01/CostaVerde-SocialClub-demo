/**
 * Capability catalog for internal roles.
 *
 * Admin-defined roles can only combine these capabilities; they cannot invent
 * new ones. Each capability guards a specific area of the API.
 */
export const PERMISSIONS = [
  'reception', // registro de visitantes, VIP, escaneo de carnet, aforo del día
  'external_payments', // ver cobros de externos registrados en recepción
  'vips', // administrar VIP
  'reports', // reportes de ocupación y finanzas
  'users', // directorio y estados de cuentas
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const CORE_ROLE_NAMES = ['admin', 'hr', 'receptionist', 'user'] as const
export type CoreRoleName = (typeof CORE_ROLE_NAMES)[number]

/** Capabilities granted to core roles by code. Admin receives every capability. */
export const CORE_ROLE_PERMISSIONS: Record<CoreRoleName, readonly Permission[]> = {
  admin: PERMISSIONS,
  receptionist: ['reception'],
  hr: [],
  user: [],
}

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value)
}

/** Role names must be lowercase identifiers and cannot shadow a core role. */
export const ROLE_NAME_PATTERN = /^[a-z][a-z0-9_]{2,31}$/

export function isReservedRoleName(name: string): boolean {
  return (CORE_ROLE_NAMES as readonly string[]).includes(name)
}

/**
 * Core grants are defined by code; catalog permissions are stored on the role.
 * Legacy permission strings from earlier seeds are ignored because they are not
 * part of the catalog.
 */
export function resolvePermissions(
  roleName: string,
  rolePermissions: string[] | null | undefined
): Permission[] {
  const core =
    (CORE_ROLE_PERMISSIONS as Record<string, readonly Permission[] | undefined>)[roleName] ?? []
  const stored = (rolePermissions ?? []).filter(isPermission)
  return Array.from(new Set<Permission>([...core, ...stored]))
}
