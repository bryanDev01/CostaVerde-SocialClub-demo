export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'pending_reminder'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface Reservation {
  id: string
  user_id: string
  activity_id: string
  reservation_date: string
  quantity: number
  status: ReservationStatus
  is_reminder_sent: boolean
  user_confirmed_at: Date | null
  attended_at: Date | null
  notes: string | null
  created_by_user_id: string | null
  created_at: Date
  updated_at: Date
}

export interface ReservationWithDetails extends Reservation {
  user_name: string
  user_ci: string
  activity_name: string
  category_name: string
}

export interface CreateReservationPayload {
  user_id: string
  activity_id: string
  reservation_date: string
  quantity: number
  notes?: string
  created_by_user_id?: string
}

export interface AffinityCheckResult {
  activity_available: boolean
  activity_remaining: number
  global_available: boolean
  global_remaining: number
  weekly_available: boolean
  weekly_count: number
  priority_window_available?: boolean
  can_reserve: boolean
  reason?: string
}

export interface WeeklyReservationCount {
  user_id: string
  active_count: number
  week_start: string
  week_end: string
}
