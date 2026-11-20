import type { StaffPermission } from '@/lib/types'

export const STAFF_PERMISSION_LABELS: Record<StaffPermission, string> = {
  reception: 'Recepción (carnet, VIP, visitantes)',
  external_payments: 'Cobros externos',
  vips: 'Administrar VIP',
  reports: 'Reportes',
  users: 'Directorio de usuarios',
}

export const ADMIN_PERMISSIONS: StaffPermission[] = [
  'external_payments',
  'vips',
  'reports',
  'users',
]

const ADMIN_ROUTE_BY_PERMISSION: { permission: StaffPermission; href: string }[] = [
  { permission: 'external_payments', href: '/admin/external-payments' },
  { permission: 'vips', href: '/admin/vips' },
  { permission: 'users', href: '/admin/users' },
  { permission: 'reports', href: '/admin' },
]

interface PermissionHolder {
  role_name: string | null
  role_permissions?: string[] | null
}

export function hasPermission(user: PermissionHolder, permission: StaffPermission): boolean {
  if (user.role_name === 'admin') return true
  return (user.role_permissions ?? []).includes(permission)
}

/** Panel where a staff member belongs; null means the member area. */
export function getStaffPanel(user: PermissionHolder): string | null {
  if (user.role_name === 'admin') return '/admin'
  if (user.role_name === 'hr') return '/hr'
  if (user.role_name === 'receptionist') return '/receptionist'
  if (hasPermission(user, 'reception')) return '/receptionist'
  const route = ADMIN_ROUTE_BY_PERMISSION.find(({ permission }) =>
    hasPermission(user, permission)
  )
  return route?.href ?? null
}

export function defaultRouteForUser(user: PermissionHolder): string {
  return getStaffPanel(user) ?? '/dashboard'
}
