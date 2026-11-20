'use client'

import { useEffect, useState } from 'react'
import { ActivityImageCarousel } from '@/components/Common/ActivityImageCarousel'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Info,
  Loader2,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormAlert } from '@/components/Common/FormAlert'
import { PageLoader } from '@/components/Common/PageLoader'
import { useActivity } from '@/lib/hooks'
import { apiGet } from '@/lib/api'
import { resolveActivityImage } from '@/lib/placeholders'
import { formatDate, formatWeekdayDay, upcomingDateValues } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { AffinityCheckResult } from '@/lib/types'

interface DayAvailability {
  date: string
  available: boolean | null
}

function useWeekAvailability(activityId: string, enabled: boolean) {
  const [days, setDays] = useState<DayAvailability[]>([])
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) {
      setDays([])
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)

    const dates = upcomingDateValues(7)

    Promise.all(
      dates.map(async (date): Promise<DayAvailability> => {
        try {
          const params = new URLSearchParams({
            activity_id: activityId,
            reservation_date: date,
            quantity: '1',
          })
          const result = await apiGet<AffinityCheckResult>(
            `/api/reservations/check?${params.toString()}`
          )
          return { date, available: result.can_reserve }
        } catch {
          return { date, available: null }
        }
      })
    ).then((results) => {
      if (!active) return
      setDays(results)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [activityId, enabled])

  return { days, loading }
}

export default function ActivityDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const activityId = params.id

  const { activity, loading, error, refetch } = useActivity(activityId)
  const reservable = activity?.is_reservable === true
  const { days, loading: daysLoading } = useWeekAvailability(activityId, reservable)

  if (loading) {
    return (
      <PageLoader
        fullScreen={false}
        className="min-h-[50vh] bg-transparent"
        title="Cargando actividad"
        description="Consultando aforo y disponibilidad..."
      />
    )
  }

  if (error || !activity) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <Link
          href="/activities"
          className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Volver a actividades
        </Link>
        <FormAlert>
          {error ?? 'No encontramos esta actividad en el club.'}
        </FormAlert>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
            Reintentar
          </Button>
          <Button className="h-11" asChild>
            <Link href="/activities">Ver otras actividades</Link>
          </Button>
        </div>
      </div>
    )
  }

  const remaining = Math.max(activity.capacity - activity.reserved_today, 0)
  const occupancy = Math.min(
    Math.round((activity.reserved_today / activity.capacity) * 100),
    100
  )

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Link
        href="/activities"
        className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver a actividades
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-fade-up motion-reduce:animate-none">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-border bg-muted shadow-[0_30px_70px_-35px_rgba(30,58,138,0.5)]">
            <ActivityImageCarousel
              images={activity.images?.length ? activity.images : [resolveActivityImage(activity)]}
              alt={activity.name}
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <span className="absolute left-5 top-5 z-10 rounded-full bg-white/95 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-sm">
              {activity.category_name}
            </span>
          </div>
        </div>

        <div className="animate-fade-up motion-reduce:animate-none" style={{ animationDelay: '100ms' }}>
          <h1 className="text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {activity.name}
          </h1>

          {activity.description ? (
            <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              {activity.description}
            </p>
          ) : null}

          {activity.location ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
              {activity.location}
            </p>
          ) : null}

          {reservable ? (
          <>
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <span>Aforo del día</span>
              <span className={cn(remaining === 0 ? 'text-danger' : 'text-primary')}>
                {remaining === 0 ? 'Completo' : `${remaining} cupos libres`}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  remaining === 0 ? 'bg-danger' : 'bg-primary'
                )}
                style={{ width: `${occupancy}%` }}
              />
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-border pt-5 text-center">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Capacidad
                </dt>
                <dd className="mt-1.5 font-display text-xl font-semibold text-foreground">
                  {activity.capacity}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Ocupados
                </dt>
                <dd className="mt-1.5 font-display text-xl font-semibold text-foreground">
                  {activity.reserved_today}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Disponibles
                </dt>
                <dd
                  className={cn(
                    'mt-1.5 font-display text-xl font-semibold',
                    remaining === 0 ? 'text-danger' : 'text-primary'
                  )}
                >
                  {remaining}
                </dd>
              </div>
            </dl>
          </div>

          <Button className="mt-7 h-12 w-full text-[15px] font-semibold sm:w-auto sm:px-8" asChild>
            <Link href={`/reservations/new?activity=${activity.id}`}>
              Reservar esta actividad
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
          </>
          ) : (
            <div className="mt-8 rounded-2xl border border-primary/25 bg-primary/5 p-6">
              <p className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                <Info className="size-5 shrink-0 text-primary" aria-hidden />
                Acceso libre: no requiere reserva
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Este lugar está disponible para los socios sin reserva previa.
                Puedes entrar directamente al club con tu carnet.
              </p>
            </div>
          )}
        </div>
      </div>

      {reservable ? (
      <section aria-labelledby="proximos-dias" className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="proximos-dias"
              className="font-display text-xl font-semibold tracking-tight text-foreground"
            >
              Próximos 7 días
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Disponibilidad estimada para 1 persona. Selecciona un día para
              reservar.
            </p>
          </div>
          {daysLoading ? (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Consultando...
            </span>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {daysLoading
            ? Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl border border-border bg-muted motion-reduce:animate-none"
                  aria-hidden
                />
              ))
            : days.map((day) => {
                const isAvailable = day.available === true
                const isUnavailable = day.available === false

                const content = (
                  <>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {formatWeekdayDay(day.date)}
                    </span>
                    <span
                      className={cn(
                        'mt-3 size-2.5 rounded-full',
                        isAvailable && 'bg-primary',
                        isUnavailable && 'bg-danger',
                        day.available === null && 'bg-muted-foreground/40'
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        'mt-2 text-[11px] font-medium',
                        isAvailable && 'text-primary',
                        isUnavailable && 'text-danger',
                        day.available === null && 'text-muted-foreground'
                      )}
                    >
                      {isAvailable
                        ? 'Disponible'
                        : isUnavailable
                          ? 'Sin cupos'
                          : 'Sin datos'}
                    </span>
                  </>
                )

                if (!isAvailable) {
                  return (
                    <div
                      key={day.date}
                      className={cn(
                        'flex flex-col items-center rounded-2xl border border-border bg-muted/40 px-3 py-4 text-center opacity-70'
                      )}
                      title={`${formatDate(day.date)}: ${
                        isUnavailable ? 'sin disponibilidad' : 'no se pudo consultar'
                      }`}
                    >
                      {content}
                    </div>
                  )
                }

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() =>
                      router.push(`/reservations/new?activity=${activity.id}&date=${day.date}`)
                    }
                    className="flex flex-col items-center rounded-2xl border border-primary/30 bg-primary/5 px-3 py-4 text-center outline-none transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/50"
                    title={`Reservar el ${formatDate(day.date)}`}
                  >
                    {content}
                  </button>
                )
              })}
        </div>

        <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5 shrink-0" aria-hidden />
          La disponibilidad puede cambiar entre la consulta y la confirmación; el
          sistema la verifica de nuevo con bloqueo seguro.
        </p>
      </section>
      ) : null}
    </div>
  )
}
