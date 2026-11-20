'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, CalendarPlus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormAlert } from '@/components/Common/FormAlert'
import { EmptyState } from '@/components/Common/EmptyState'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { ReservationCard } from '@/components/Cards/ReservationCard'
import { useActiveReservations, useActivities, useReservations } from '@/lib/hooks'
import { cn } from '@/lib/utils'

type TabKey = 'active' | 'all'

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: string
  count: number
}

function TabButton({ active, onClick, children, count }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-background hover:text-foreground'
      )}
    >
      {children}
      <span
        className={cn(
          'grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold',
          active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
        )}
      >
        {count}
      </span>
    </button>
  )
}

export default function ReservationsPage() {
  const [tab, setTab] = useState<TabKey>('active')

  const {
    reservations: activeReservations,
    loading: activeLoading,
    error: activeError,
    refetch: refetchActive,
  } = useActiveReservations()

  const {
    reservations: allReservations,
    loading: allLoading,
    error: allError,
    refetch: refetchAll,
  } = useReservations()

  const { activities } = useActivities()

  const activityById = useMemo(() => {
    return new Map(activities.map((activity) => [activity.id, activity]))
  }, [activities])

  const sortedAll = useMemo(() => {
    return [...allReservations].sort((a, b) =>
      b.reservation_date.localeCompare(a.reservation_date)
    )
  }, [allReservations])

  const visibleReservations = tab === 'active' ? activeReservations : sortedAll
  const loading = tab === 'active' ? activeLoading : allLoading
  const error = tab === 'active' ? activeError : allError

  const refetchVisible = () => {
    refetchActive()
    refetchAll()
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Mis reservas
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Tus visitas al club
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Recuerda: puedes tener hasta 2 reservas activas por semana y
              confirmar tu asistencia 48 horas antes de cada visita.
            </p>
          </div>
          <Button className="h-11" asChild>
            <Link href="/activities">
              <CalendarPlus className="size-4" aria-hidden />
              Nueva reserva
            </Link>
          </Button>
        </div>
      </header>

      <div
        className="mt-8 inline-flex rounded-xl border border-border bg-muted/60 p-1"
        role="group"
        aria-label="Filtrar reservas"
      >
        <TabButton
          active={tab === 'active'}
          onClick={() => setTab('active')}
          count={activeReservations.length}
        >
          Activas
        </TabButton>
        <TabButton
          active={tab === 'all'}
          onClick={() => setTab('all')}
          count={allReservations.length}
        >
          Todas
        </TabButton>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((item) => (
              <SkeletonCard key={item} lines={2} />
            ))}
          </div>
        ) : error ? (
          <div className="space-y-5">
            <FormAlert>No se pudieron cargar tus reservas: {error}</FormAlert>
            <Button variant="outline" className="h-11 bg-background" onClick={refetchVisible}>
              <RefreshCw className="size-4" aria-hidden />
              Reintentar
            </Button>
          </div>
        ) : visibleReservations.length === 0 ? (
          tab === 'active' ? (
            <EmptyState
              icon={CalendarDays}
              title="No tienes reservas activas"
              description="Explora las actividades del club y aprovecha los cupos disponibles para esta semana."
              action={
                <Button className="h-11" asChild>
                  <Link href="/activities">Reservar una actividad</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="Aún no has hecho reservas"
              description="Cuando reserves una actividad aparecerá aquí con todo su historial de estados."
              action={
                <Button className="h-11" asChild>
                  <Link href="/activities">Ver actividades</Link>
                </Button>
              }
            />
          )
        ) : (
          <ul className="space-y-4">
            {visibleReservations.map((reservation) => (
              <li key={reservation.id}>
                <ReservationCard
                  reservation={reservation}
                  activity={activityById.get(reservation.activity_id) ?? null}
                  onCancelled={refetchVisible}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
