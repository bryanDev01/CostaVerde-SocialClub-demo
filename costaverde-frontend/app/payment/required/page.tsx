'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormAlert } from '@/components/Common/FormAlert'
import { LogoutButton } from '@/components/Common/LogoutButton'
import { SkeletonGrid } from '@/components/Common/SkeletonCard'
import { useAuth } from '@/app/providers'
import { usePlans, useSubscription } from '@/lib/hooks'
import { formatDate } from '@/lib/dates'
import { MAX_ASSOCIATES, PAYMENT_METHOD_LABEL, SUPPORT_EMAIL } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { SubscriptionPlan } from '@/lib/types'

const PLAN_FEATURES = [
  'Acceso a todas las actividades',
  `Hasta ${MAX_ASSOCIATES} acompañantes`,
  'Carné digital con QR',
  'Reserva en línea 24/7',
]

function formatDuration(months: number): string {
  return months === 1 ? '1 mes' : `${months} meses`
}

function PendingPaymentCard() {
  return (
    <div className="mx-auto max-w-xl text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Clock className="size-6" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Tienes un pago en proceso
      </h1>
      <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
        Si ya realizaste la transferencia con {PAYMENT_METHOD_LABEL}, un administrador la
        validará en menos de 24 horas y tu suscripción se activará
        automáticamente.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-left shadow-sm">
        <p className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
          <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            ¿No completaste el pago o necesitas ayuda? Escribe a{' '}
            <span className="font-medium text-foreground">
              {SUPPORT_EMAIL}
            </span>{' '}
            indicando tu CI para retomar el proceso.
          </span>
        </p>
      </div>

      <Button variant="outline" className="mt-6 h-11 bg-background" asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </div>
  )
}

function SuspendedNotice({
  expiresAt,
  canRenew,
  note,
}: {
  expiresAt?: string | null
  canRenew: boolean
  note?: ReactNode
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger/10 text-danger">
        <ShieldAlert className="size-6" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Tu cuenta está suspendida
      </h1>
      <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
        {expiresAt
          ? `Tu suscripción venció el ${formatDate(expiresAt)} y superaste el período de gracia. `
          : 'Un administrador suspendió el acceso de tu cuenta. '}
        Mientras esté suspendida no puedes reservar ni acceder al panel.
      </p>

      <div className="mt-8 rounded-2xl border border-danger/20 bg-danger/5 p-5 text-left">
        <p className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
          <Mail className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
          <span>
            {note ??
              (canRenew ? (
                'Renueva tu suscripción con uno de los planes de abajo. Al validarse el pago, tu cuenta se reactivará automáticamente.'
              ) : (
                <>
                  Para reactivar tu acceso contacta a administración en{' '}
                  <span className="font-medium text-foreground">
                    {SUPPORT_EMAIL}
                  </span>{' '}
                  indicando tu CI.
                </>
              ))}
          </span>
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" className="h-11 bg-background" asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
        <LogoutButton className="h-11" />
      </div>
    </div>
  )
}

function ActiveSubscriptionCard({ expiresAt }: { expiresAt: string | null }) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <CheckCircle2 className="size-6" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Tu suscripción está activa
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {expiresAt
          ? `Disfruta del club hasta el ${formatDate(expiresAt)}.`
          : 'Disfruta de todas las actividades del club.'}
      </p>
      <Button className="mt-8 h-12 px-7 text-[15px]" asChild>
        <Link href="/dashboard">Ir a mi panel</Link>
      </Button>
    </div>
  )
}

function PlanOption({
  plan,
  highlighted,
}: {
  plan: SubscriptionPlan
  highlighted: boolean
}) {
  return (
    <article
      className={cn(
        'relative flex flex-col rounded-2xl border p-6 transition-all duration-300',
        highlighted
          ? 'border-primary bg-primary text-primary-foreground shadow-[0_24px_50px_-25px_rgba(30,58,138,0.65)]'
          : 'border-border bg-card shadow-sm hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(30,58,138,0.35)]'
      )}
    >
      {plan.discount_percent > 0 ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-danger px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-danger-foreground shadow-md">
          Ahorras {plan.discount_percent}%
        </span>
      ) : null}

      <p
        className={cn(
          'text-xs font-semibold uppercase tracking-[0.2em]',
          highlighted ? 'text-white/60' : 'text-muted-foreground'
        )}
      >
        {plan.name}
      </p>

      <p className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-3xl font-semibold tracking-tight">
          ${plan.price_cup}
        </span>
        <span className={cn('text-sm', highlighted ? 'text-white/60' : 'text-muted-foreground')}>
          CUP
        </span>
      </p>
      <p className={cn('mt-1 text-sm', highlighted ? 'text-white/70' : 'text-muted-foreground')}>
        Acceso por {formatDuration(plan.duration_months)}
      </p>

      <ul className="mt-6 flex-1 space-y-2.5">
        {PLAN_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <span
              className={cn(
                'mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full',
                highlighted ? 'bg-white/15 text-white' : 'bg-primary/10 text-primary'
              )}
            >
              <Check className="size-3" aria-hidden />
            </span>
            <span className={highlighted ? 'text-white/85' : 'text-muted-foreground'}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={`/payment/subscription/${plan.id}`}
        className={cn(
          'mt-7 grid h-11 place-items-center rounded-lg text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50',
          highlighted
            ? 'bg-white text-primary hover:bg-white/90'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
      >
        Pagar este plan
      </Link>
    </article>
  )
}

function PlanChooser({
  plans,
  highlightedPlan,
  badge = 'Activación pendiente',
  title = 'Elige tu plan de suscripción',
  description = `Tu cuenta está creada y lista. Activa tu acceso pagando con ${PAYMENT_METHOD_LABEL}: solo necesitas el código de referencia que te mostraremos a continuación.`,
}: {
  plans: SubscriptionPlan[]
  highlightedPlan: SubscriptionPlan | undefined
  badge?: string
  title?: string
  description?: string
}) {
  return (
    <div>
      <header className="mx-auto max-w-2xl text-center animate-fade-up motion-reduce:animate-none">
        <span className="inline-flex items-center gap-2 rounded-full border border-danger/20 bg-danger/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-danger">
          <span className="size-1.5 rounded-full bg-danger" aria-hidden />
          {badge}
        </span>
        <h1 className="mt-6 text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </header>

      {plans.length === 0 ? (
        <div className="mx-auto mt-12 max-w-xl">
          <FormAlert>
            No hay planes disponibles en este momento. Contacta a
            administración en {SUPPORT_EMAIL}.
          </FormAlert>
        </div>
      ) : (
        <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <PlanOption
              key={plan.id}
              plan={plan}
              highlighted={plan.id === highlightedPlan?.id}
            />
          ))}
        </div>
      )}

      <div className="mx-auto mt-10 flex max-w-xl items-start justify-center gap-2.5 text-center text-xs leading-relaxed text-muted-foreground">
        <Loader2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>
          Tus datos de pago son verificados manualmente por un administrador.
          La activación puede tardar hasta 24 horas después de confirmar la
          transacción.
        </p>
      </div>
    </div>
  )
}

export default function PaymentRequiredPage() {
  const { user } = useAuth()
  const { plans, loading: plansLoading, error: plansError, refetch: refetchPlans } = usePlans()
  const {
    subscription,
    loading: subscriptionLoading,
    error: subscriptionError,
    refetch: refetchSubscription,
  } = useSubscription()

  const loading = plansLoading || subscriptionLoading
  const error = plansError ?? subscriptionError

  const isSuspended = user?.user_status === 'suspended'
  const isActiveMember = user
    ? user.user_status === 'active' || user.user_status === 'external_active'
    : false

  const highlightedPlan =
    plans.find((plan) => plan.duration_months === 3) ?? plans[0]

  // A suspended user can renew unless a payment is already under review or
  // their current subscription is still validated (admin suspension only).
  const canRenew =
    subscription?.status !== 'validated' &&
    subscription?.status !== 'pending_validation'

  const refetchAll = () => {
    refetchPlans()
    refetchSubscription()
  }

  if (loading) {
    return (
      <div>
        <div className="mx-auto h-8 w-64 animate-pulse rounded-full bg-muted" aria-hidden />
        <SkeletonGrid count={4} className="mt-12 xl:grid-cols-4" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <FormAlert>{error}</FormAlert>
        <Button variant="outline" className="h-11 bg-background" onClick={refetchAll}>
          <RefreshCw className="size-4" aria-hidden />
          Reintentar
        </Button>
      </div>
    )
  }

  // A suspended account takes precedence (no dashboard link), but the user
  // must still be able to renew: validating a payment reactivates them.
  if (isSuspended) {
    return (
      <div>
        <SuspendedNotice
          expiresAt={subscription?.expires_at}
          canRenew={canRenew}
          note={
            subscription?.status === 'pending_validation'
              ? 'Tu pago está en proceso de validación. Cuando administración lo confirme, tu cuenta se reactivará automáticamente.'
              : undefined
          }
        />
        {subscription?.status === 'pending_validation' ? (
          <div className="mt-16">
            <PendingPaymentCard />
          </div>
        ) : canRenew ? (
          <div className="mt-16">
            <PlanChooser
              plans={plans}
              highlightedPlan={highlightedPlan}
              badge="Reactivación"
              title="Reactiva tu suscripción"
              description="Elige un plan y paga con Transfermóvil · Pago en línea. Cuando administración valide el pago, tu cuenta se reactivará automáticamente."
            />
          </div>
        ) : null}
      </div>
    )
  }

  if (subscription?.status === 'pending_validation') {
    return <PendingPaymentCard />
  }

  if (subscription?.status === 'validated') {
    return isActiveMember ? (
      <ActiveSubscriptionCard expiresAt={subscription.expires_at} />
    ) : (
      <SuspendedNotice expiresAt={subscription.expires_at} canRenew={false} />
    )
  }

  return <PlanChooser plans={plans} highlightedPlan={highlightedPlan} />
}
