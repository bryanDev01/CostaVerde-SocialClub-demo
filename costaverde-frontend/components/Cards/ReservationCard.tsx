'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarDays, UserX, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/Common/ConfirmDialog'
import { StatusBadge } from '@/components/Common/StatusBadge'
import { useReservationActions } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import { formatDate } from '@/lib/dates'
import { resolveActivityImage } from '@/lib/placeholders'
import type { ActivityWithCategory, Reservation } from '@/lib/types'

const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'pending_reminder']

interface ReservationCardProps {
  reservation: Reservation
  activity?: ActivityWithCategory | null
  onCancelled?: () => void
}

export function ReservationCard({
  reservation,
  activity,
  onCancelled,
}: ReservationCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { cancelReservation } = useReservationActions()

  const canCancel = CANCELLABLE_STATUSES.includes(reservation.status)
  const activityName = activity?.name ?? 'Actividad del club'
  const guests =
    reservation.quantity === 1
      ? 'Solo el titular'
      : `Titular + ${reservation.quantity - 1} ${
          reservation.quantity - 1 === 1 ? 'acompañante' : 'acompañantes'
        }`

  const handleCancel = async () => {
    try {
      await cancelReservation(reservation.id)
      toast.success('Reserva cancelada. El cupo fue liberado.')
      onCancelled?.()
    } catch (error) {
      toast.error(
        describeApiError(error, 'No se pudo cancelar la reserva')
      )
    }
  }

  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center">
      <div className="relative hidden size-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:block">
        {activity ? (
          <Image
            src={resolveActivityImage(activity)}
            alt={activityName}
            width={160}
            height={160}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-primary/40">
            <CalendarDays className="size-6" aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
            {activityName}
          </h3>
          <StatusBadge status={reservation.status} scope="reservation" />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            {formatDate(reservation.reservation_date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-4 shrink-0" aria-hidden />
            {guests}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <Link
          href={`/reservations/${reservation.id}`}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Ver detalle
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        {canCancel ? (
          <Button
            variant="ghost"
            className="h-10 text-muted-foreground hover:bg-danger/10 hover:text-danger"
            onClick={() => setConfirmOpen(true)}
          >
            <UserX className="size-4" aria-hidden />
            Cancelar
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Cancelar esta reserva?"
        description={`Se liberarán los cupos de ${activityName} para el ${formatDate(
          reservation.reservation_date
        )}. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, cancelar"
        cancelLabel="Mantener reserva"
        variant="danger"
        onConfirm={handleCancel}
      />
    </article>
  )
}
