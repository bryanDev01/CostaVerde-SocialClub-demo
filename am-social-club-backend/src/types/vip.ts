export interface VipUser {
  id: string
  name: string
  ci: string
  partners_count: number
  is_active: boolean
  created_by_user_id: string | null
  created_at: Date
  updated_at: Date
}

export interface CreateVipPayload {
  name: string
  ci: string
  partners_count: number
}

export interface UpdateVipPayload {
  name?: string
  ci?: string
  partners_count?: number
  is_active?: boolean
}

export type VisitKind = 'vip' | 'walk_in' | 'associate'

export type VisitPaymentMethod = 'cash' | 'transfer' | 'other'

export interface VisitPaymentInput {
  amount_cup: number
  payment_method: VisitPaymentMethod
  payment_reference?: string | null
}

export interface Visit {
  id: string
  kind: VisitKind
  vip_id: string | null
  responsible_user_id: string | null
  responsible_name: string
  responsible_ci: string | null
  partner_count: number
  /** false when the person is already counted by a reservation that day. */
  counts_aforo: boolean
  amount_cup: number | null
  payment_method: VisitPaymentMethod | null
  visit_date: Date
  created_by_user_id: string | null
  created_at: Date
}
