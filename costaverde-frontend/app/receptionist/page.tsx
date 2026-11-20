'use client'

import Link from 'next/link'
import {
  CalendarDays,
  ScanLine,
  Ticket,
  Users,
  Volume2,
  UserPlus,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/Common/EmptyState'
import { FormAlert } from '@/components/Common/FormAlert'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { useReceptionToday } from '@/lib/hooks'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { ActivityAvailability } from '@/lib/types'

const QUICK_ACTIONS = [
  {
    icon: ScanLine,
    label: 'Escanear carnet',
    description: 'Verificar acceso de un socio',
    href: '/receptionist/scan-carnet',
  },
  {
    icon: Ticket,
    label: 'Entrada de asociado',
    description: 'Cobrar la entrada del día',
    href: '/receptionist/associate-entry',
  },
  {
    icon: UserPlus,
    label: 'Registrar visitante',
    description: 'Dar de alta a un usuario externo',
    href: '/receptionist/register-external',
  },
]

function getOccupancyColor(percent: number): string {
  if (percent >= 90) return 'bg-danger'
  if (percent >= 75) return 'bg-primary'
  return 'bg-primary/50'
}

function ActivityRow({ activity }: { activity: ActivityAvailability }) {
  const reservedPercent =
    activity.capacity > 0
      ? Math.round((activity.reserved_today / activity.capacity) * 100)
      : 0

  return (
    <li className="border-b border-border px-5 py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {activity.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {activity.category_name ?? 'General'} · capacidad {activity.capacity}
          </p>
        </div>
        <span className="shrink-0 font-mono text-sm font-semibold text-foreground">
          {activity.reserved_today}
          <span className="text-muted-foreground">/{activity.capacity}</span>
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            getOccupancyColor(reservedPercent)
          )}
          style={{ width: `${reservedPercent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {activity.remaining > 0 ? (
          <>
            <span className="font-semibold text-primary">
              {activity.remaining}
            </span>{' '}
            cupos disponibles
          </>
        ) : (
          <span className="font-semibold text-danger">Cupos agotados</span>
        )}
      </p>
    </li>
  )
}

export default function ReceptionistDashboardPage() {
  const { today, loading, error, refetch } = useReceptionToday()

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

  if (!today) return null

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Recepción
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Aforo de hoy
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {formatDate(today.date, "cccc d 'de' MMMM 'de' yyyy")}. Ocupación en
          tiempo real del club para controlar el acceso en puerta.
        </p>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Users className="size-5" aria-hidden />
          </span>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Personas dentro
          </p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
            {today.total_today}
            <span className="text-lg text-muted-foreground"> / {today.global_capacity}</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                getOccupancyColor(today.occupancy_percent)
              )}
              style={{ width: `${today.occupancy_percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {today.occupancy_percent}% de ocupación
          </p>
        </article>

        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Volume2 className="size-5" aria-hidden />
          </span>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Cupos disponibles
          </p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-primary">
            {today.remaining_today}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Para el resto del día
          </p>
        </article>

        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="size-5" aria-hidden />
          </span>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Reservas registradas
          </p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
            {today.reservation_count}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            En todas las actividades
          </p>
        </article>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="ocupacion-actividades">
          <div className="flex items-center justify-between gap-4">
            <h2
              id="ocupacion-actividades"
              className="font-display text-xl font-semibold tracking-tight text-foreground"
            >
              Ocupación por actividad
            </h2>
          </div>

          {today.activities.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={CalendarDays}
                title="Sin actividades activas"
                description="No hay actividades habilitadas hoy. Ajusta la configuración desde el panel de administración."
              />
            </div>
          ) : (
            <ul className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {today.activities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="acciones-recepcion">
          <h2
            id="acciones-recepcion"
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
    </div>
  )
}