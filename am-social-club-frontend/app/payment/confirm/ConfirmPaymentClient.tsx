'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormAlert } from '@/components/Common/FormAlert'
import { StatusBadge } from '@/components/Common/StatusBadge'
import { PaymentForm } from '@/components/Forms/PaymentForm'
import { CopyButton } from '@/components/Common/CopyButton'
import { PAYMENT_METHOD_LABEL } from '@/lib/constants'
import type { Payment } from '@/lib/types'

function SuccessPanel({ payment }: { payment: Payment }) {
  return (
    <div className="mx-auto max-w-xl animate-fade-up text-center motion-reduce:animate-none">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <CheckCircle2 className="size-8" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        ¡Transacción enviada!
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        Registramos tu pago correctamente. Un administrador lo comparará con el
        SMS bancario y activará tu suscripción.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-left shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Resumen del pago
          </p>
          <StatusBadge status={payment.status} scope="payment" />
        </div>

        <dl className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <dt className="text-sm text-muted-foreground">Monto</dt>
            <dd className="font-display text-lg font-semibold text-foreground">
              ${payment.amount_cup} CUP
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <dt className="text-sm text-muted-foreground">Código de referencia</dt>
            <dd className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-foreground">
                {payment.reference_code}
              </span>
              <CopyButton value={payment.reference_code} label="Copiar" />
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <dt className="text-sm text-muted-foreground">Número de transacción</dt>
            <dd className="font-mono text-sm font-semibold text-foreground">
              {payment.transaction_number ?? '—'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-muted/50 p-5 text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          ¿Qué sigue?
        </p>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li className="flex items-start gap-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            Un administrador validará tu pago en menos de 24 horas.
          </li>
          <li className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            Tu suscripción se activa automáticamente al aprobarse el pago.
          </li>
          <li className="flex items-start gap-3">
            <CalendarCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            Recibirás tu carné digital y podrás reservar actividades.
          </li>
        </ul>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button className="h-12 px-7 text-[15px]" asChild>
          <Link href="/payment/required">Ver estado de mi pago</Link>
        </Button>
        <Button variant="outline" className="h-12 bg-background px-7 text-[15px]" asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  )
}

export function ConfirmPaymentClient() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('payment_id')
  const [confirmedPayment, setConfirmedPayment] = useState<Payment | null>(null)

  if (confirmedPayment) {
    return <SuccessPanel payment={confirmedPayment} />
  }

  if (!paymentId) {
    return (
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <FormAlert>
          No encontramos un pago pendiente de confirmación. Genera tu código de
          pago desde la página de planes e inténtalo de nuevo.
        </FormAlert>
        <Button variant="outline" className="h-11 bg-background" asChild>
          <Link href="/payment/required">
            <ArrowLeft className="size-4" aria-hidden />
            Volver a los planes
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl animate-fade-up motion-reduce:animate-none">
      <Link
        href="/payment/required"
        className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver
      </Link>

      <header className="mt-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Confirma tu transacción
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Ingresa el número de transacción que recibiste por SMS después de
          pagar con {PAYMENT_METHOD_LABEL}. Así podremos validar tu pago.
        </p>
      </header>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
        <PaymentForm paymentId={paymentId} onSuccess={setConfirmedPayment} />
      </div>
    </div>
  )
}
