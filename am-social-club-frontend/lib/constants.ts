import { BRAND } from './branding'
import type {
  FamilyRelation,
  PaymentStatus,
  ReservationStatus,
  SubscriptionStatus,
  UserStatus,
} from './types'

export const APP_NAME = BRAND.name
export const LOGO_IMAGE = BRAND.logos.primary
export const SUPPORT_EMAIL = BRAND.supportEmail
export const HR_EMAIL = BRAND.hrEmail
export const SUPPORT_PHONE = BRAND.phone

export const PAYMENT_METHOD_LABEL = BRAND.paymentMethodLabel

export const MAX_ASSOCIATES = 6
export const GRACE_PERIOD_DAYS = 5
export const MAX_RESERVATIONS_PER_WEEK = 2
export const GLOBAL_DAILY_CAPACITY = 500
export const PER_VISIT_PRICE_CUP = 1500

export const FAMILY_RELATIONS: { value: FamilyRelation; label: string }[] = [
  { value: 'spouse', label: 'Cónyuge' },
  { value: 'son', label: 'Hijo' },
  { value: 'daughter', label: 'Hija' },
  { value: 'parent', label: 'Padre / Madre' },
  { value: 'sibling', label: 'Hermano / Hermana' },
  { value: 'other', label: 'Otro' },
]

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  pending_activation: 'Pendiente de activación',
  pending_payment: 'Pago pendiente',
  active: 'Activa',
  suspended: 'Suspendida',
  inactive: 'Inactiva',
  external_active: 'Activo',
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  pending_reminder: 'Confirmar asistencia',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending_validation: 'Validación pendiente',
  validated: 'Validada',
  rejected: 'Rechazada',
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  pending_validation: 'Validación pendiente',
  validated: 'Activa',
  rejected: 'Rechazada',
  expired: 'Expirada',
}

export const USER_ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  hr: 'Recursos Humanos',
  receptionist: 'Recepcionista',
  user: 'Socio',
}
