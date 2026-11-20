'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  QrCode,
  ScanLine,
  ShieldCheck,
  Star,
  Ticket,
  User,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/Common/Logo'
import { NotificationBell } from '@/components/Common/NotificationBell'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/app/providers'
import { logout } from '@/lib/auth'
import { USER_ROLE_LABELS } from '@/lib/constants'
import { hasPermission } from '@/lib/staff'
import { cn } from '@/lib/utils'
import type { StaffPermission } from '@/lib/types'

export type AppShellVariant = 'user' | 'admin' | 'hr' | 'receptionist'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** When set, custom internal roles need this capability to see the item. */
  permission?: StaffPermission
}

const NAV_ITEMS: Record<AppShellVariant, NavItem[]> = {
  user: [
    { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
    { href: '/activities', label: 'Actividades', icon: Activity },
    { href: '/reservations', label: 'Mis reservas', icon: CalendarDays },
    { href: '/profile/carnet', label: 'Mi carnet', icon: QrCode },
    { href: '/profile', label: 'Mi perfil', icon: User },
  ],
  admin: [
    { href: '/admin', label: 'Panel', icon: LayoutDashboard, permission: 'reports' },
    { href: '/admin/payments', label: 'Pagos', icon: Wallet },
    { href: '/admin/external-payments', label: 'Cobros externos', icon: Wallet, permission: 'external_payments' },
    { href: '/admin/users', label: 'Usuarios', icon: Users, permission: 'users' },
    { href: '/admin/vips', label: 'VIP', icon: Star, permission: 'vips' },
    { href: '/admin/companies', label: 'Empresas', icon: Building2 },
    { href: '/admin/reports', label: 'Reportes', icon: BarChart3, permission: 'reports' },
    { href: '/admin/reports/general', label: 'Reporte General', icon: FileBarChart2, permission: 'reports' },
    { href: '/admin/reports/daily', label: 'Resumen Diario', icon: CalendarDays, permission: 'reports' },
    { href: '/admin/reports/capacity', label: 'Capacidad', icon: MapPin, permission: 'reports' },
    { href: '/admin/roles', label: 'Roles', icon: ShieldCheck },
    { href: '/admin/staff', label: 'Cuentas internas', icon: UserCog },
  ],
  hr: [
    { href: '/hr', label: 'Panel', icon: LayoutDashboard },
    { href: '/hr/upload-employees', label: 'Cargar empleados', icon: ClipboardList },
    { href: '/hr/employees', label: 'Empleados', icon: Users },
    { href: '/hr/users', label: 'Usuarios', icon: User },
    { href: '/hr/reports', label: 'Reportes', icon: BarChart3 },
    { href: '/hr/companies', label: 'Empresas', icon: Building2 },
  ],
  receptionist: [
    { href: '/receptionist', label: 'Panel', icon: LayoutDashboard },
    { href: '/receptionist/scan-carnet', label: 'Escanear carnet', icon: ScanLine },
    { href: '/receptionist/vips', label: 'Verificar VIP', icon: Star },
    { href: '/receptionist/associate-entry', label: 'Entrada de asociado', icon: Ticket },
    { href: '/receptionist/register-external', label: 'Registrar externo', icon: UserPlus },
  ],
}

const VARIANT_LABELS: Record<AppShellVariant, string> = {
  user: 'Área de socios',
  admin: 'Administración',
  hr: 'Recursos Humanos',
  receptionist: 'Recepción',
}

interface AppShellProps {
  variant: AppShellVariant
  children: ReactNode
}

function findActiveHref(pathname: string, items: NavItem[]): string | null {
  const matches = items.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )
  if (matches.length === 0) return null
  return matches.sort((a, b) => b.href.length - a.href.length)[0].href
}

export function AppShell({ variant, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  const items = NAV_ITEMS[variant]
  const visibleItems =
    variant === 'admin' && user && user.role_name !== 'admin'
      ? items.filter((item) => !item.permission || hasPermission(user, item.permission))
      : items
  const activeHref = findActiveHref(pathname, visibleItems)
  const isPartnerArea = variant === 'user'

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  const nav = (
    <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Navegación principal">
      {visibleItems.map((item) => {
        const active = item.href === activeHref
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="size-4.5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  const userCard = (
    <div className="border-t border-border p-4">
      <div className="rounded-xl bg-muted/60 p-4">
        <p className="truncate text-sm font-semibold text-foreground">
          {user?.name ?? 'Socio'}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {user?.email ?? ''}
        </p>
        <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          {user?.role_name ? USER_ROLE_LABELS[user.role_name] ?? user.role_name : VARIANT_LABELS[variant]}
        </span>
      </div>
      <Button
        variant="outline"
        className="mt-3 h-11 w-full justify-start gap-2.5 bg-background text-muted-foreground hover:text-foreground"
        onClick={handleLogout}
      >
        <LogOut className="size-4" aria-hidden />
        Cerrar sesión
      </Button>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-border bg-background lg:flex print:hidden">
        <div className="flex h-18 items-center justify-between gap-3 border-b border-border px-6">
          <Logo compact />
          <NotificationBell align="start" />
        </div>
        {isPartnerArea ? null : (
          <p className="px-6 pt-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {VARIANT_LABELS[variant]}
          </p>
        )}
        {nav}
        {userCard}
      </aside>

      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Cerrar menú"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-background transition-transform duration-300 lg:hidden print:hidden',
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-hidden={!menuOpen}
      >
        <div className="flex h-18 items-center justify-between border-b border-border px-5">
          <Logo compact />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="grid size-10 place-items-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
        </div>
        {nav}
        {userCard}
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-72 print:pl-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/85 px-4 backdrop-blur-md lg:hidden print:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid size-10 place-items-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <Logo compact />
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-8 lg:py-10 print:px-0 print:py-0">{children}</main>
      </div>
    </div>
  )
}
