'use client'

import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/Common/EmptyState'
import { FormAlert } from '@/components/Common/FormAlert'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { StatusBadge } from '@/components/Common/StatusBadge'
import { usePreEmployees } from '@/lib/hooks'
import { formatDate } from '@/lib/dates'

const QUICK_ACTIONS = [
  {
    icon: Users,
    label: 'Usuarios',
    description: 'Cuentas y estados de todas las empresas',
    href: '/hr/users',
  },
  {
    icon: BarChart3,
    label: 'Reportes',
    description: 'Estado global por empresa',
    href: '/hr/reports',
  },
  {
    icon: ClipboardList,
    label: 'Cargar empleados',
    description: 'Precarga masiva por CSV o Excel',
    href: '/hr/upload-employees',
  },
  {
    icon: Users,
    label: 'Ver empleados',
    description: 'Estado de cada precarga',
    href: '/hr/employees',
  },
]

export default function HrDashboardPage() {
  const { employees, loading, error, refetch } = usePreEmployees()

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <div className="h-8 w-64 animate-pulse rounded-full bg-muted" aria-hidden />
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <SkeletonCard key={item} lines={2} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <FormAlert>No se pudo cargar el panel: {error}</FormAlert>
        <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
          Reintentar
        </Button>
      </div>
    )
  }

  const pending = employees.filter((employee) => employee.status === 'pending')
  const activated = employees.filter((employee) => employee.status === 'activated')
  const rejected = employees.filter((employee) => employee.status === 'rejected')

  const recentEmployees = [...employees]
    .sort(
      (a, b) =>
        new Date(b.imported_at).getTime() - new Date(a.imported_at).getTime()
    )
    .slice(0, 6)

  const activationRate =
    employees.length > 0
      ? Math.round((activated.length / employees.length) * 100)
      : 0

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Recursos Humanos
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Panel de precarga
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Gestiona la precarga y el seguimiento de empleados corporativos de
          cualquier empresa. Los empleados aparecen aquí hasta que completen
          su registro y activen su cuenta.
        </p>
      </header>

      {employees.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={ClipboardList}
            title="Aún no hay empleados precargados"
            description="Sube un archivo CSV o Excel para precargar empleados de cualquier empresa. Podrán registrarse validando su CI."
            action={
              <Button className="h-11" asChild>
                <Link href="/hr/upload-employees">
                  <ClipboardList className="size-4" aria-hidden />
                  Cargar empleados
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Clock className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Pendientes de registro
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
                {pending.length}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Aún no crean su cuenta
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <CheckCircle2 className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Cuentas activadas
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-primary">
                {activated.length}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${activationRate}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {activationRate}% de conversión
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-danger/10 text-danger">
                <Users className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Total precargados
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
                {employees.length}
              </p>
              {rejected.length > 0 ? (
                <p className="mt-1.5 text-xs text-danger">
                  {rejected.length} {rejected.length === 1 ? 'rechazado' : 'rechazados'}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Sin rechazos
                </p>
              )}
            </article>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <section aria-labelledby="empleados-recientes">
              <div className="flex items-center justify-between gap-4">
                <h2
                  id="empleados-recientes"
                  className="font-display text-xl font-semibold tracking-tight text-foreground"
                >
                  Precargas recientes
                </h2>
                <Link
                  href="/hr/employees"
                  className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  Ver todos
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>

              <ul className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {recentEmployees.map((employee) => (
                  <li
                    key={employee.id}
                    className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {employee.name}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        CI {employee.ci}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {formatDate(employee.imported_at, 'd MMM yyyy')}
                      </span>
                      <StatusBadge
                        status={employee.status}
                        label={
                          employee.status === 'pending'
                            ? 'Pendiente'
                            : employee.status === 'activated'
                              ? 'Activado'
                              : 'Rechazado'
                        }
                        variant={
                          employee.status === 'pending'
                            ? 'pending'
                            : employee.status === 'activated'
                              ? 'positive'
                              : 'negative'
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="acciones-rrhh">
              <h2
                id="acciones-rrhh"
                className="font-display text-xl font-semibold tracking-tight text-foreground"
              >
                Accesos rápidos
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {QUICK_ACTIONS.map((action) => (
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
        </>
      )}
    </div>
  )
}
