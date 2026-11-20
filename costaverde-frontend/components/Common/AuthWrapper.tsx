'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { logout } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/Common/PageLoader'
import { defaultRouteForUser, getStaffPanel } from '@/lib/staff'
import type { StaffPermission, UserRole } from '@/lib/types'

const RESTRICTED_STATUSES = ['pending_payment', 'suspended'] as const
const BLOCKED_STATUSES = ['inactive', 'pending_activation'] as const

const MEMBER_PREFIXES = ['/dashboard', '/activities', '/reservations', '/profile', '/payment']

function isMemberRoute(pathname: string): boolean {
  return MEMBER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function hasAllowedRole(userRole: UserRole | null, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false
  return allowedRoles.includes(userRole)
}

function hasAllowedPermission(
  granted: string[] | null | undefined,
  allowedPermissions: StaffPermission[]
): boolean {
  return (granted ?? []).some((permission) =>
    (allowedPermissions as string[]).includes(permission)
  )
}

interface AuthWrapperProps {
  children: ReactNode
  allowedRoles?: UserRole[]
  /** Any of these capabilities also grants access (used by custom internal roles). */
  allowedPermissions?: StaffPermission[]
  allowRestricted?: boolean
}

export function AuthWrapper({
  children,
  allowedRoles,
  allowedPermissions,
  allowRestricted = false,
}: AuthWrapperProps) {
  const { user, loading, error, refreshUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isBlocked = user
    ? (BLOCKED_STATUSES as readonly string[]).includes(user.user_status)
    : false
  const isRestricted = user
    ? (RESTRICTED_STATUSES as readonly string[]).includes(user.user_status)
    : false
  const accessGranted =
    (!allowedRoles && !allowedPermissions) ||
    (user
      ? hasAllowedRole(user.role_name, allowedRoles ?? []) ||
        hasAllowedPermission(user.role_permissions, allowedPermissions ?? [])
      : false)
  const roleDenied = user && (allowedRoles || allowedPermissions) ? !accessGranted : false
  const staffPanel = user ? getStaffPanel(user) : null
  const staffOnMemberRoute = Boolean(staffPanel) && isMemberRoute(pathname)

  useEffect(() => {
    if (loading) return

    if (!user) {
      // A *failed* session load (error) must NOT redirect: proxy.ts still
      // sees the auth cookie and would bounce /login -> /dashboard, while
      // we bounce /dashboard -> /login — an infinite reload loop. Show a
      // retry screen instead.
      if (error) return
      router.replace('/login')
      return
    }

    if (isBlocked) {
      logout()
      router.replace('/login')
      return
    }

    if (isRestricted && !allowRestricted) {
      router.replace('/payment/required')
      return
    }

    if (roleDenied) {
      router.replace(defaultRouteForUser(user))
      return
    }

    if (staffOnMemberRoute) {
      router.replace(staffPanel ?? '/dashboard')
    }
  }, [user, loading, error, router, pathname, isBlocked, isRestricted, roleDenied, staffOnMemberRoute, staffPanel, allowRestricted])

  if (loading) {
    return <PageLoader title="Verificando tu sesión" description="Un momento, estamos validando tu acceso..." />
  }

  if (!user) {
    if (error) {
      return (
        <div className="grid min-h-screen place-items-center bg-background px-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <h1 className="font-display text-xl font-semibold text-foreground">
              No pudimos verificar tu sesión
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {error}
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button className="h-11" onClick={() => { void refreshUser() }}>
                Reintentar
              </Button>
              <Button
                variant="outline"
                className="h-11 bg-background"
                onClick={() => { router.replace('/login') }}
              >
                Ir a iniciar sesión
              </Button>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  if (isBlocked) return null

  if (isRestricted && !allowRestricted) return null

  if (roleDenied) return null

  if (staffOnMemberRoute) return null

  return <>{children}</>
}
