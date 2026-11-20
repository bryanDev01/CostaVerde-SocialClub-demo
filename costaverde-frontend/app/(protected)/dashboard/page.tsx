'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CreditCard,
  Loader2,
  QrCode,
  RefreshCw,
  Users,
  Waves,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/Common/EmptyState'
import { FormAlert } from '@/components/Common/FormAlert'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { StatusBadge } from '@/components/Common/StatusBadge'
import { ReservationCard } from '@/components/Cards/ReservationCard'
import { useAuth } from '@/app/providers'
import { describeApiError } from '@/lib/errorMessages'
import {
  useActiveReservations,
  useActivities,
  useReservationActions,
  useReservations,
  useSubscription,
} from '@/lib/hooks'
import {
  daysUntil,
  formatDate,
  formatShortDate,
  isWithinCurrentWeek,
} from '@/lib/dates'
import { MAX_RESERVATIONS_PER_WEEK } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Subscription } from '@/lib/types'

const ACTIVE_STATUSES = ['pending', 'confirmed', 'pending_reminder']

const QUICK_ACTIONS = [
  {
    icon: Waves,
    label: 'Reservar actividad',
    description: 'Piscina, tenis, billar y más',
    href: '/activities',
  },
  {
    icon: QrCode,
    label: 'Mi carnet digital',
    description: 'Código QR de acceso al club',
    href: '/profile/carnet',
  },
  {
    icon: Users,
    label: 'Mis acompañantes',
    description: 'Hasta 4 familiares por titular',
    href: '/profile',
  },
  {
    icon: CreditCard,
    label: 'Estado de cuenta',
    description: 'Suscripción y datos de contacto',
    href: '/profile',
  },
]

function getSubscriptionSummary(subscription: Subscription | null, userType: string) {
  if (!subscription) {
    return userType === 'external'
      ? { value: 'Por visita', caption: 'Pagas tu acceso en recepción', tone: 'neutral' as const }
      : { value: 'Sin activar', caption: 'Elige un plan para empezar', tone: 'danger' as const }
  }

  if (subscription.status === 'validated') {
    if (subscription.expires_at) {
      const remaining = daysUntil(subscription.expires_at)
      if (remaining <= 0) {
        return {
          value: 'Vencida',
          caption: 'Regulariza tu pago para mantener el acceso',
          tone: 'danger' as const,
        }
      }
      return {
        value: 'Activa',
        caption:
          remaining === 0
            ? 'Vence hoy'
            : `Vence en ${remaining} ${remaining === 1 ? 'día' : 'días'}`,
        tone: 'positive' as const,
      }
    }
    return { value: 'Activa', caption: 'Suscripción validada', tone: 'positive' as const }
  }

  if (subscription.status === 'pending_validation') {
    return {
      value: 'En revisión',
      caption: 'Validaremos tu pago en menos de 24 h',
      tone: 'pending' as const,
    }
  }

  if (subscription.status === 'rejected') {
    return {
      value: 'Rechazada',
      caption: 'Revisa tu pago e inténtalo de nuevo',
      tone: 'danger' as const,
    }
  }

  return {
    value: 'Vencida',
    caption: 'Renueva tu suscripción para volver',
    tone: 'danger' as const,
  }
}

export default function DashboardPage() {
  const { user } = useAuth()

  const {
    reservations: activeReservations,
    loading: activeLoading,
    error: activeError,
    refetch: refetchActive,
  } = useActiveReservations()

  const { reservations: allReservations, refetch: refetchAll } = useReservations()
  const { activities } = useActivities()
  const {
    subscription,
    loading: subscriptionLoading,
    error: subscriptionError,
  } = useSubscription()
  const { confirmAttendance } = useReservationActions()

  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const activityById = useMemo(() => {
    return new Map(activities.map((activity) => [activity.id, activity]))
  }, [activities])

  if (!user) return null

  const loading = activeLoading || subscriptionLoading
  const error = activeError ?? subscriptionError

  const nextReservation = activeReservations[0] ?? null
  const nextActivity = nextReservation
    ? activityById.get(nextReservation.activity_id) ?? null
    : null

  const pendingReminders = activeReservations.filter(
    (reservation) => reservation.status === 'pending_reminder'
  )

  const weeklyActive = allReservations.filter(
    (reservation) =>
      ACTIVE_STATUSES.includes(reservation.status) &&
      isWithinCurrentWeek(reservation.reservation_date)
  ).length

  const completedVisits = allReservations.filter(
    (reservation) => reservation.status === 'completed'
  ).length

  const subscriptionSummary = getSubscriptionSummary(subscription, user.user_type)
  const firstName = user.name.split(' ')[0]

  const refetchAllData = () => {
    refetchActive()
    refetchAll()
  }

  const handleConfirmAttendance = async (reservationId: string) => {
    setConfirmingId(reservationId)
    try {
      await confirmAttendance(reservationId)
      toast.success('Asistencia confirmada. ¡Te esperamos!')
      refetchAllData()
    } catch (err) {
      toast.error(
        describeApiError(err, 'No se pudo confirmar la asistencia')
      )
    } finally {
      setConfirmingId(null)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <div className="h-8 w-64 animate-pulse rounded-full bg-muted" aria-hidden />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <SkeletonCard key={item} lines={2} />
          ))}
        </div>
        <div className="mt-8 space-y-4">
          {[0, 1].map((item) => (
            <SkeletonCard key={item} lines={2} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <FormAlert>No se pudo cargar tu panel: {error}</FormAlert>
        <Button variant="outline" className="h-11 bg-background" onClick={refetchAllData}>
          <RefreshCw className="size-4" aria-hidden />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Panel de socio
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Hola, {firstName}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {nextReservation
            ? `Tu próxima visita es el ${formatDate(nextReservation.reservation_date)}. ${
                nextActivity ? `Te esperamos en ${nextActivity.name}.` : ''
              }`
            : 'Aún no tienes visitas programadas. Reserva tu próxima actividad y disfruta del club.'}
        </p>
      </header>

      {pendingReminders.length > 0 ? (
        <div className="mt-7 space-y-4">
          {pendingReminders.map((reservation) => (
            <div
              key={reservation.id}
              className="flex flex-col gap-4 rounded-2xl border border-danger/30 bg-danger/5 p-5 sm:flex-row sm:items-center sm:justify-between animate-fade-up motion-reduce:animate-none"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="mt-0.5 size-5 shrink-0 text-danger"
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-semibold text-danger">
                    Confirma tu visita del{' '}
                    {formatDate(reservation.reservation_date)}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-danger/90">
                    Tu reserva está a menos de 48 horas. Si no confirmas, se
                    cancelará automáticamente.
                  </p>
                </div>
              </div>
              <Button
                className="h-11 shrink-0 font-semibold"
                onClick={() => handleConfirmAttendance(reservation.id)}
                disabled={confirmingId === reservation.id}
              >
                {confirmingId === reservation.id ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Confirmando...
                  </>
                ) : (
                  'Confirmar asistencia'
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {subscription?.is_grace_period ? (
        <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-danger/30 bg-danger/5 p-5 sm:flex-row sm:items-center sm:justify-between animate-fade-up motion-reduce:animate-none">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-danger">
                Tu suscripción está en período de gracia
              </p>
              <p className="mt-1 text-sm leading-relaxed text-danger/90">
                Regulariza tu pago antes del día 6 para evitar la suspensión de
                tu cuenta.
              </p>
            </div>
          </div>
          <Button className="h-11 shrink-0 font-semibold" asChild>
            <Link href="/payment/required">Pagar ahora</Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Próxima reserva
          </p>
          {nextReservation ? (
            <>
              <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-primary">
                {formatShortDate(nextReservation.reservation_date)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {nextActivity?.name ?? 'Actividad del club'} ·{' '}
                {nextReservation.quantity === 1
                  ? '1 persona'
                  : `${nextReservation.quantity} personas`}
              </p>
              <Link
                href={`/reservations/${nextReservation.id}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                Ver detalle
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </>
          ) : (
            <>
              <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-muted-foreground">
                Sin visitas
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Programa tu próxima actividad en el club.
              </p>
              <Link
                href="/activities"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                Reservar
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </>
          )}
        </article>

        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Reservas activas
          </p>
          <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground">
            {activeReservations.length}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {weeklyActive} de {MAX_RESERVATIONS_PER_WEEK} esta semana
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                weeklyActive >= MAX_RESERVATIONS_PER_WEEK ? 'bg-danger' : 'bg-primary'
              )}
              style={{
                width: `${Math.min(
                  (weeklyActive / MAX_RESERVATIONS_PER_WEEK) * 100,
                  100
                )}%`,
              }}
            />
          </div>
          {completedVisits > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {completedVisits}{' '}
              {completedVisits === 1 ? 'visita completada' : 'visitas completadas'}
            </p>
          ) : null}
        </article>

        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Suscripción
            </p>
            <StatusBadge status={user.user_status} scope="user" />
          </div>
          <p
            className={cn(
              'mt-4 font-display text-3xl font-semibold tracking-tight',
              subscriptionSummary.tone === 'positive' && 'text-primary',
              subscriptionSummary.tone === 'pending' && 'text-primary',
              subscriptionSummary.tone === 'danger' && 'text-danger',
              subscriptionSummary.tone === 'neutral' && 'text-muted-foreground'
            )}
          >
            {subscriptionSummary.value}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {subscriptionSummary.caption}
          </p>
          {subscriptionSummary.tone === 'danger' ? (
            <Link
              href="/payment/required"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Activar suscripción
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : subscription?.status === 'pending_validation' ? (
            <Link
              href="/payment/required"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Ver estado del pago
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </article>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="proximas-reservas">
          <div className="flex items-center justify-between gap-4">
            <h2
              id="proximas-reservas"
              className="font-display text-xl font-semibold tracking-tight text-foreground"
            >
              Próximas reservas
            </h2>
            <Link
              href="/reservations"
              className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Ver todas
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="mt-5">
            {activeReservations.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Sin reservas activas"
                description="Explora las actividades del club y aparta tu próximo día de descanso."
                action={
                  <Button className="h-11" asChild>
                    <Link href="/activities">
                      <CalendarPlus className="size-4" aria-hidden />
                      Reservar una actividad
                    </Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-4">
                {activeReservations.map((reservation) => (
                  <li key={reservation.id}>
                    <ReservationCard
                      reservation={reservation}
                      activity={activityById.get(reservation.activity_id) ?? null}
                      onCancelled={refetchAllData}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-labelledby="accesos-rapidos">
          <h2
            id="accesos-rapidos"
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
