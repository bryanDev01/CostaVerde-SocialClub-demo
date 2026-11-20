'use client'

import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormAlert } from '@/components/Common/FormAlert'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { useAdminDashboard } from '@/lib/hooks'
import { cn } from '@/lib/utils'

const QUICK_ACTIONS = [
  {
    icon: Wallet,
    label: 'Validar pagos',
    description: 'Revisa las transferencias pendientes',
    href: '/admin/payments',
  },
  {
    icon: Users,
    label: 'Gestionar usuarios',
    description: 'Activa, suspende o desactiva cuentas',
    href: '/admin/users',
  },
  {
    icon: BarChart3,
    label: 'Reportes',
    description: 'Ocupación e ingresos del período',
    href: '/admin/reports',
  },
]

export default function AdminDashboardPage() {
  const { stats, loading, error, refetch } = useAdminDashboard()
  const quickActions = QUICK_ACTIONS

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <div className="h-8 w-64 animate-pulse rounded-full bg-muted" aria-hidden />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <SkeletonCard key={item} lines={2} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <FormAlert>No se pudo cargar el panel: {error}</FormAlert>
        <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
          Reintentar
        </Button>
      </div>
    )
  }

  const aforoPercent = Math.min(
    Math.round((stats.aforo_today / stats.global_capacity) * 100),
    100
  )

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Administración
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Panel de control del club
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Estado del día en tiempo real: pagos pendientes, ocupación y
          actividad de los socios.
        </p>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <article
          className={cn(
            'rounded-2xl border bg-card p-6 shadow-sm',
            stats.pending_payments > 0 ? 'border-danger/30' : 'border-border'
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Pagos pendientes
          </p>
          <p
            className={cn(
              'mt-4 font-display text-3xl font-semibold tracking-tight',
              stats.pending_payments > 0 ? 'text-danger' : 'text-foreground'
            )}
          >
            {stats.pending_payments}
          </p>
          <Link
            href="/admin/payments"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Revisar pagos
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </article>

        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Usuarios activos
          </p>
          <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-primary">
            {stats.active_users}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            de {stats.total_users} cuentas registradas
          </p>
        </article>

        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Aforo de hoy
          </p>
          <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground">
            {stats.aforo_today}
            <span className="ml-1 text-base font-normal text-muted-foreground">
              / {stats.global_capacity}
            </span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                aforoPercent >= 90 ? 'bg-danger' : 'bg-primary'
              )}
              style={{ width: `${aforoPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {stats.reservations_today}{' '}
            {stats.reservations_today === 1 ? 'reserva' : 'reservas'} ·{' '}
            {aforoPercent}% ocupado
          </p>
        </article>

        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ingresos del mes
          </p>
          <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-primary">
            ${stats.revenue_this_month}
            <span className="ml-1 text-base font-normal text-muted-foreground">CUP</span>
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Pagos validados en el mes en curso
          </p>
        </article>
      </div>

      <section aria-labelledby="acciones-admin" className="mt-12">
        <h2
          id="acciones-admin"
          className="font-display text-xl font-semibold tracking-tight text-foreground"
        >
          Accesos rápidos
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm outline-none transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <action.icon className="size-5" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {action.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {action.description}
                </span>
              </span>
              <ArrowRight
                className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
