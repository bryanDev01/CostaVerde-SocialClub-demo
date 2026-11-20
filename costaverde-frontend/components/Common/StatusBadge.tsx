import { cn } from "@/lib/utils"
import {
  PAYMENT_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  USER_STATUS_LABELS,
} from "@/lib/constants"

type StatusVariant = "positive" | "pending" | "negative" | "neutral"
const VARIANT_CLASSES: Record<StatusVariant, string> = {
  positive: "border-primary/20 bg-primary/10 text-primary",
  pending: "border-primary/30 bg-transparent text-primary",
  negative: "border-danger/20 bg-danger/10 text-danger",
  neutral: "border-border bg-muted/60 text-muted-foreground",
}

const STATUS_VARIANTS: Record<string, StatusVariant> = {
  // Usuario
  active: "positive",
  external_active: "positive",
  pending_payment: "pending",
  pending_activation: "pending",
  suspended: "negative",
  inactive: "neutral",
  // Reserva
  confirmed: "positive",
  pending: "pending",
  pending_reminder: "negative",
  completed: "neutral",
  cancelled: "negative",
  no_show: "negative",
  // Pago / suscripción
  pending_validation: "pending",
  validated: "positive",
  rejected: "negative",
  expired: "neutral",
}

export type StatusScope = "user" | "reservation" | "payment" | "subscription"

const SCOPE_LABELS: Record<StatusScope, Record<string, string>> = {
  user: USER_STATUS_LABELS,
  reservation: RESERVATION_STATUS_LABELS,
  payment: PAYMENT_STATUS_LABELS,
  subscription: SUBSCRIPTION_STATUS_LABELS,
}

interface StatusBadgeProps {
  status: string
  scope?: StatusScope
  label?: string
  variant?: StatusVariant
  className?: string
}

export function StatusBadge({ status, scope, label, variant: variantProp, className }: StatusBadgeProps) {
  const variant = variantProp ?? STATUS_VARIANTS[status] ?? "neutral"
  const text = label ?? (scope ? SCOPE_LABELS[scope][status] : undefined) ?? status

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          variant === "positive" && "bg-primary",
          variant === "pending" && "bg-primary/60",
          variant === "negative" && "bg-danger",
          variant === "neutral" && "bg-muted-foreground/50"
        )}
        aria-hidden
      />
      {text}
    </span>
  )
}
