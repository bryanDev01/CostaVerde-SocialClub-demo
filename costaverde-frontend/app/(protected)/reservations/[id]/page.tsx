'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleSlash,
  Clock,
  Loader2,
  MapPin,
  StickyNote,
  Users,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/Common/ConfirmDialog'
import { FormAlert } from '@/components/Common/FormAlert'
import { PageLoader } from '@/components/Common/PageLoader'
import { StatusBadge } from '@/components/Common/StatusBadge'
import { useActivities, useReservation, useReservationActions } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import { formatDate, formatDateTime } from '@/lib/dates'
import { resolveActivityImage } from '@/lib/placeholders'
import { cn } from '@/lib/utils'

type StepState = 'done' | 'current' | 'pending' | 'cancelled'

interface TimelineStep {
  title: string
  description: string
  state: StepState
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') {
    return (
      <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
        <CheckCircle2 className="size-4" aria-hidden />
      </span>
    )
  }
  if (state === 'current') {
    return (
      <span className="grid size-8 place-items-center rounded-full border-2 border-primary bg-background text-primary">
        <Clock className="size-4" aria-hidden />
      </span>
    )
  }
  if (state === 'cancelled') {
    return (
      <span className="grid size-8 place-items-center rounded-full bg-danger/10 text-danger">
        <CircleSlash className="size-4" aria-hidden />
      </span>
    )
  }
  return (
    <span className="grid size-8 place-items-center rounded-full border border-border bg-muted/60 text-muted-foreground">
      <Circle className="size-4" aria-hidden />
    </span>
  )
}

function buildTimeline(reservation: {
  status: string
  created_at: string
  user_confirmed_at: string | null
  attended_at: string | null
}): TimelineStep[] {
  const { status, created_at, user_confirmed_at, attended_at } = reservation

  const created: TimelineStep = {
    title: 'Reserva creada',
    description: `Solicitada el ${formatDateTime(created_at)}`,
    state: 'done',
  }

  let confirmed: TimelineStep
  if (status === 'cancelled') {
    confirmed = {
      title: 'Reserva cancelada',
      description: 'La reserva y sus cupos fueron liberados.',
      state: 'cancelled',
    }
  } else if (status === 'pending') {
    confirmed = {
      title: 'Validación de aforo',
      description: 'Estamos validando la disponibilidad de tu reserva.',
      state: 'current',
    }
  } else {
    confirmed = {
      title: 'Aforo validado',
      description: 'Tu reserva quedó confirmada por el club.',
      state: 'done',
    }
  }

  let attendance: TimelineStep
  if (status === 'cancelled') {
    attendance = {
      title: 'Confirmación de asistencia',
      description: 'No aplica: la reserva fue cancelada.',
      state: 'cancelled',
    }
  } else if (user_confirmed_at) {
    attendance = {
      title: 'Asistencia confirmada',
      description: `Confirmada el ${formatDateTime(user_confirmed_at)}`,
      state: 'done',
    }
  } else if (status === 'pending_reminder') {
    attendance = {
      title: 'Confirma tu asistencia',
      description: 'Tu reserva está a menos de 48 horas. Confírmala para no perderla.',
      state: 'current',
    }
  } else {
    attendance = {
      title: 'Confirmación de asistencia (48 h)',
      description: 'Se habilitará cuando falten 48 horas para tu visita.',
      state: 'pending',
    }
  }

  let visit: TimelineStep
  if (status === 'completed') {
    visit = {
      title: 'Visita completada',
      description: attended_at
        ? `Registramos tu entrada el ${formatDateTime(attended_at)}`
        : 'Disfrutaste tu visita al club.',
      state: 'done',
    }
  } else if (status === 'no_show') {
    visit = {
      title: 'No asististe',
      description: 'No registramos tu entrada al club para esta reserva.',
      state: 'cancelled',
    }
  } else if (status === 'cancelled') {
    visit = {
      title: 'Visita al club',
      description: 'No aplica: la reserva fue cancelada.',
      state: 'pending',
    }
  } else {
    visit = {
      title: 'Visita al club',
      description: 'Presenta tu carné digital con QR en la entrada.',
      state: 'pending',
    }
  }

  return [created, confirmed, attendance, visit]
}

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>()
  const reservationId = params.id

  const { reservation, loading, error, refetch } = useReservation(reservationId)
  const { activities } = useActivities()
  const { cancelReservation, confirmAttendance } = useReservationActions()

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [confirmingAttendance, setConfirmingAttendance] = useState(false)

  if (loading) {
    return (
      <PageLoader
        fullScreen={false}
        className="min-h-[50vh] bg-transparent"
        title="Cargando reserva"
        description="Consultando el estado de tu reserva..."
      />
    )
  }

  if (error || !reservation) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <Link
          href="/reservations"
          className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Volver a mis reservas
        </Link>
        <FormAlert>{error ?? 'No encontramos esta reserva.'}</FormAlert>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
            Reintentar
          </Button>
          <Button className="h-11" asChild>
            <Link href="/reservations">Ver mis reservas</Link>
          </Button>
        </div>
      </div>
    )
  }

  const activity = activities.find((item) => item.id === reservation.activity_id) ?? null
  const timeline = buildTimeline(reservation)

  const canCancel = ['pending', 'confirmed', 'pending_reminder'].includes(
    reservation.status
  )
  const needsAttendanceConfirmation = reservation.status === 'pending_reminder'

  const guests =
    reservation.quantity === 1
      ? 'Solo el titular'
      : `Titular + ${reservation.quantity - 1} ${
          reservation.quantity - 1 === 1 ? 'acompañante' : 'acompañantes'
        }`

  const handleConfirmAttendance = async () => {
    setConfirmingAttendance(true)
    try {
      await confirmAttendance(reservation.id)
      toast.success('Asistencia confirmada. ¡Te esperamos!')
      refetch()
    } catch (err) {
      toast.error(
        describeApiError(err, 'No se pudo confirmar la asistencia')
      )
    } finally {
      setConfirmingAttendance(false)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelReservation(reservation.id)
      toast.success('Reserva cancelada. El cupo fue liberado.')
      refetch()
    } catch (err) {
      toast.error(
        describeApiError(err, 'No se pudo cancelar la reserva')
      )
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link
        href="/reservations"
        className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver a mis reservas
      </Link>

      <header className="mt-6 animate-fade-up motion-reduce:animate-none">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            {reservation.category_name}
          </p>
          <StatusBadge status={reservation.status} scope="reservation" />
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {reservation.activity_name}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Reserva creada el {formatDateTime(reservation.created_at)}
        </p>
      </header>

      {needsAttendanceConfirmation ? (
        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-danger/30 bg-danger/5 p-5 sm:flex-row sm:items-center sm:justify-between animate-fade-up motion-reduce:animate-none">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-danger">
                Tu visita está a menos de 48 horas
              </p>
              <p className="mt-1 text-sm leading-relaxed text-danger/90">
                Confirma tu asistencia para no perder la reserva. Si no
                confirmas, se cancelará automáticamente.
              </p>
            </div>
          </div>
          <Button
            className="h-11 shrink-0 font-semibold"
            onClick={handleConfirmAttendance}
            disabled={confirmingAttendance}
          >
            {confirmingAttendance ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Confirmando...
              </>
            ) : (
              'Confirmar asistencia'
            )}
          </Button>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section
          aria-labelledby="detalle-reserva"
          className="animate-fade-up motion-reduce:animate-none"
          style={{ animationDelay: '80ms' }}
        >
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
            <h2
              id="detalle-reserva"
              className="font-display text-xl font-semibold tracking-tight text-foreground"
            >
              Detalles de la reserva
            </h2>

            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/50 p-4">
                <dt className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <CalendarDays className="size-3.5" aria-hidden />
                  Fecha de la visita
                </dt>
                <dd className="mt-2 font-display text-lg font-semibold text-foreground">
                  {formatDate(reservation.reservation_date)}
                </dd>
              </div>
              <div className="rounded-xl bg-muted/50 p-4">
                <dt className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <Users className="size-3.5" aria-hidden />
                  Personas
                </dt>
                <dd className="mt-2 font-display text-lg font-semibold text-foreground">
                  {guests}
                </dd>
              </div>
            </dl>

            {reservation.notes ? (
              <div className="mt-5 rounded-xl border border-border p-4">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <StickyNote className="size-3.5" aria-hidden />
                  Notas
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  {reservation.notes}
                </p>
              </div>
            ) : null}

            <div className="mt-7 border-t border-border pt-6">
              <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
                Historial de la reserva
              </h3>
              <ol className="mt-5 space-y-0">
                {timeline.map((step, index) => (
                  <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                    {index < timeline.length - 1 ? (
                      <span
                        className={cn(
                          'absolute left-4 top-9 h-[calc(100%-2rem)] w-px',
                          step.state === 'done' && timeline[index + 1]?.state === 'done'
                            ? 'bg-primary/30'
                            : 'bg-border'
                        )}
                        aria-hidden
                      />
                    ) : null}
                    <StepIcon state={step.state} />
                    <div className="pt-1">
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          step.state === 'cancelled' ? 'text-danger' : 'text-foreground',
                          step.state === 'pending' && 'text-muted-foreground'
                        )}
                      >
                        {step.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <aside
          className="space-y-6 lg:sticky lg:top-24 lg:self-start animate-fade-up motion-reduce:animate-none"
          style={{ animationDelay: '160ms' }}
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {activity ? (
              <div className="relative aspect-[16/9] bg-muted">
                <Image
                  src={resolveActivityImage(activity)}
                  alt={reservation.activity_name}
                  width={800}
                  height={450}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
            <div className="p-5">
              <p className="font-display text-lg font-semibold tracking-tight text-foreground">
                {reservation.activity_name}
              </p>
              {activity?.location ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  {activity.location}
                </p>
              ) : null}
              <Button variant="outline" className="mt-4 h-10 w-full bg-background" asChild>
                <Link href={`/activities/${reservation.activity_id}`}>
                  Ver actividad
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
              Acciones
            </h2>

            {canCancel ? (
              <Button
                variant="outline"
                className="mt-4 h-11 w-full border-danger/30 bg-background text-danger hover:bg-danger/10 hover:text-danger"
                onClick={() => setConfirmCancelOpen(true)}
              >
                <XCircle className="size-4" aria-hidden />
                Cancelar reserva
              </Button>
            ) : (
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <CalendarCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                {reservation.status === 'completed'
                  ? 'Esta visita ya fue completada. ¡Gracias por venir!'
                  : reservation.status === 'cancelled'
                    ? 'Esta reserva fue cancelada y sus cupos fueron liberados.'
                    : 'Esta reserva ya no requiere acciones.'}
              </p>
            )}

            <Button variant="ghost" className="mt-2 h-11 w-full" asChild>
              <Link href="/activities">Reservar otra actividad</Link>
            </Button>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        title="¿Cancelar esta reserva?"
        description={`Se liberarán los cupos de ${reservation.activity_name} para el ${formatDate(
          reservation.reservation_date
        )}. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, cancelar"
        cancelLabel="Mantener reserva"
        variant="danger"
        onConfirm={handleCancel}
      />
    </div>
  )
}
