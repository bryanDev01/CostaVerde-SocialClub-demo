export type PaymentType = 'subscription' | 'per_visit'

export type PaymentStatus = 'pending_validation' | 'validated' | 'rejected'

export interface Payment {
  id: string
  user_id: string
  subscription_id: string | null
  amount_cup: number
  reference_code: string
  transaction_number: string | null
  status: PaymentStatus
  payment_type: PaymentType
  reservation_id: string | null
  validated_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface PaymentWithUser extends Payment {
  user_name: string
  user_ci: string
  user_email: string | null
}

export interface CreatePaymentPayload {
  user_id: string
  subscription_id?: string
  amount_cup: number
  reference_code: string
  transaction_number?: string
  payment_type: PaymentType
  reservation_id?: string
}

export interface PaymentReconciliationPayload {
  status: 'validated' | 'rejected'
}

export interface ExternalPerVisitPaymentPayload {
  user_id: string
  reservation_id: string
  amount_cup: number
  reference_code: string
  transaction_number?: string
}
