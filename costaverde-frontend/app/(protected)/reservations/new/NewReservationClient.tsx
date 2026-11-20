'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ReservationForm } from '@/components/Forms/ReservationForm'

export function NewReservationClient() {
  const searchParams = useSearchParams()
  const activityId = searchParams.get('activity') ?? undefined
  const date = searchParams.get('date') ?? undefined

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Link
        href="/activities"
        className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver a actividades
      </Link>

      <header className="mt-6 animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Nueva reserva
        </p>
        <h1 className="mt-4 text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Reserva tu actividad
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          Verificamos el aforo de la actividad, el aforo global del club y tu
          límite semanal antes de confirmar. Puedes incluir hasta cuatro
          acompañantes registrados.
        </p>
      </header>

      <div className="mt-10">
        <ReservationForm initialActivityId={activityId} initialDate={date} />
      </div>
    </div>
  )
}
