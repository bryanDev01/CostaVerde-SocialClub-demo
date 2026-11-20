export type SubscriptionStatus =
  | 'pending_validation'
  | 'validated'
  | 'rejected'
  | 'expired'

export type SubscriptionDuration = 1 | 3 | 6 | 12

export interface SubscriptionPlan {
  id: string
  name: string
  duration_months: SubscriptionDuration
  price_cup: number
  discount_percent: number
  is_active: boolean
  created_at: Date
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  price_paid: number
  status: SubscriptionStatus
  started_at: Date | null
  expires_at: Date | null
  is_grace_period: boolean
  created_at: Date
  updated_at: Date
}

export interface SubscriptionWithPlan extends Subscription {
  plan_name: string
  duration_months: SubscriptionDuration
}

export interface CreateSubscriptionPayload {
  user_id: string
  plan_id: string
  price_paid: number
}
