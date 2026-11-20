'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Loader2,
  QrCode,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormAlert } from '@/components/Common/FormAlert'
import { CopyButton } from '@/components/Common/CopyButton'
import { PageLoader } from '@/components/Common/PageLoader'
import { StatusBadge } from '@/components/Common/StatusBadge'
import { usePayment, usePlans } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import { PAYMENT_METHOD_LABEL } from '@/lib/constants'
import type { PaymentIntentResult } from '@/lib/types'

function formatDuration(months: number): string {
  return months === 1 ? '1 mes' : `${months} meses`
}

function PaymentQr({ qrUrl }: { qrUrl: string }) {
  const hasRealQr = qrUrl.startsWith('http')

  return (
    <div className="grid place-items-center rounded-2xl border border-border bg-white p-6">
      {hasRealQr ? (
        // eslint-disable-next-line @next/next/no-img-element -- QR estático externo sin dimensiones conocidas
        <img
          src={qrUrl}
          alt="Código QR de pago del club (Transfermóvil · Pago en línea)"
          className="size-52 object-contain"
        />
      ) : (
        <div className="grid size-52 place-items-center rounded-xl border border-dashed border-input bg-muted/40 text-center">
          <div>
            <QrCode className="mx-auto size-10 text-primary/40" aria-hidden />
            <p className="mt-3 px-4 text-xs leading-relaxed text-muted-foreground">
              Espacio reservado para el QR de pago del club (Transfermóvil · Pago en línea)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SubscriptionPaymentPage() {
  const params = useParams<{ id: string }>()
  const planId = params.id

  const { plans, loading: plansLoading, error: plansError } = usePlans()
  const { createIntent } = usePayment()

  const [intent, setIntent] = useState<PaymentIntentResult | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const plan = plans.find((item) => item.id === planId)

  const handleCreateIntent = async () => {
    setCreating(true)
    setError(null)
    try {
      const result = await createIntent(planId)
      setIntent(result)
    } catch (err) {
      setError(
        describeApiError(err, 'No se pudo generar el código de pago')
      )
    } finally {
      setCreating(false)
    }
  }

  if (plansLoading) {
    return <PageLoader fullScreen={false} className="min-h-[40vh] bg-transparent" />
  }

  if (plansError) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <FormAlert>{plansError}</FormAlert>
        <Button variant="outline" className="h-11 bg-background" asChild>
          <Link href="/payment/required">
            <ArrowLeft className="size-4" aria-hidden />
            Volver a los planes
          </Link>
        </Button>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-xl space-y-5 text-center">
        <FormAlert>
          El plan seleccionado no existe o ya no está disponible.
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

  if (!intent) {
    return (
      <div className="mx-auto max-w-xl animate-fade-up motion-reduce:animate-none">
        <Link
          href="/payment/required"
          className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Elegir otro plan
        </Link>

        <div className="mt-8 rounded-2xl border border-border bg-card p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Plan seleccionado
          </p>
          <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {plan.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acceso por {formatDuration(plan.duration_months)}
          </p>

          <div className="mt-6 flex items-baseline gap-2 border-t border-border pt-6">
            <span className="font-display text-4xl font-semibold tracking-tight text-primary">
              ${plan.price_cup}
            </span>
            <span className="text-sm text-muted-foreground">CUP</span>
          </div>

          {error ? (
            <div className="mt-6">
              <FormAlert>{error}</FormAlert>
            </div>
          ) : null}

          <Button
            className="mt-7 h-12 w-full text-[15px] font-semibold"
            onClick={handleCreateIntent}
            disabled={creating}
          >
            {creating ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Generando código...
              </>
            ) : (
              <>
                Generar código de pago
                <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </Button>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            Se creará un código de referencia único para tu transferencia con{' '}
            {PAYMENT_METHOD_LABEL}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-up motion-reduce:animate-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Realiza tu transferencia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan.name} · ${plan.price_cup} CUP
          </p>
        </div>
        <StatusBadge status="pending_validation" scope="payment" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <PaymentQr qrUrl={intent.qr_url} />

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Código de referencia
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-2xl font-semibold tracking-wider text-primary">
                {intent.payment.reference_code}
              </span>
              <CopyButton value={intent.payment.reference_code} label="Copiar código" />
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <Building2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Usa este código en el concepto de la transferencia para que podamos
              identificarla.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Método de pago
            </p>
            <p className="mt-2 text-sm font-semibold text-primary">
              {PAYMENT_METHOD_LABEL}
            </p>
            <ol className="mt-4 space-y-3.5 text-sm leading-relaxed text-muted-foreground">
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  1
                </span>
                Abre la aplicación Transfermóvil en tu teléfono.
              </li>
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  2
                </span>
                Escanea el código QR o selecciona la cuenta del club.
              </li>
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  3
                </span>
                Transfiere exactamente{' '}
                <span className="font-semibold text-foreground">
                  ${intent.payment.amount_cup} CUP
                </span>{' '}
                e introduce el código de referencia.
              </li>
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  4
                </span>
                Guarda el número de transacción del SMS y confírmalo en el
                siguiente paso.
              </li>
            </ol>
          </div>

          <div className="flex flex-col gap-3">
            <Button className="h-12 text-[15px] font-semibold" asChild>
              <Link href={`/payment/confirm?payment_id=${intent.payment.id}`}>
                Ya transferí, confirmar pago
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden />
              Validación manual en menos de 24 horas
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
