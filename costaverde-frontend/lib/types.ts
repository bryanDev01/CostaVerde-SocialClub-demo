export type UserStatus =
  | 'pending_activation'
  | 'pending_payment'
  | 'active'
  | 'suspended'
  | 'inactive'
  | 'external_active'

export type UserRole = 'admin' | 'hr' | 'receptionist' | 'user' | (string & {})
export type UserType = 'corporate' | 'external'

export type FamilyRelation = 'spouse' | 'son' | 'daughter' | 'parent' | 'sibling' | 'other'

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'pending_reminder'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type PaymentType = 'subscription' | 'per_visit'
export type PaymentStatus = 'pending_validation' | 'validated' | 'rejected'
export type SubscriptionStatus =
  | 'pending_validation'
  | 'validated'
  | 'rejected'
  | 'expired'
export type SubscriptionDuration = 1 | 3 | 6 | 12

export interface User {
  id: string
  ci: string
  email: string | null
  name: string
  phone: string | null
  company_id: string | null
  user_type: UserType
  user_status: UserStatus
  profile_photo_url: string | null
  role_id: string | null
  created_by_user_id: string | null
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  ci: string
  email: string | null
  name: string
  phone: string | null
  company_id: string | null
  company_name: string | null
  user_type: UserType
  user_status: UserStatus
  profile_photo_url: string | null
  role_name: UserRole | null
  role_permissions?: string[] | null
  created_at: string
}

export interface ActivityCategory {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface Activity {
  id: string
  category_id: string
  name: string
  description: string | null
  capacity: number
  reserved_count: number
  location: string | null
  image_url: string | null
  is_active: boolean
  /** true = can be booked; false = informational place (free access). */
  is_reservable: boolean
  /** Every photo of the place, main photo first. */
  images: string[]
  /** Seats already booked for today (club timezone). */
  reserved_today: number
  created_at: string
  updated_at: string
}

export interface ActivityWithCategory extends Activity {
  category_name: string
}

export interface Reservation {
  id: string
  user_id: string
  activity_id: string
  reservation_date: string
  quantity: number
  status: ReservationStatus
  is_reminder_sent: boolean
  user_confirmed_at: string | null
  attended_at: string | null
  notes: string | null
  created_by_user_id: string | null
  created_at: string
  updated_at: string
}

export interface ReservationWithDetails extends Reservation {
  user_name: string
  user_ci: string
  activity_name: string
  category_name: string
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

export interface SubscriptionPlan {
  id: string
  name: string
  duration_months: SubscriptionDuration
  price_cup: number
  discount_percent: number
  is_active: boolean
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  price_paid: number
  status: SubscriptionStatus
  started_at: string | null
  expires_at: string | null
  is_grace_period: boolean
  created_at: string
  updated_at: string
}

export interface SubscriptionWithPlan extends Subscription {
  plan_name: string
  duration_months: SubscriptionDuration
}

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
  validated_at: string | null
  created_at: string
  updated_at: string
}

export interface PaymentWithUser extends Payment {
  user_name: string
  user_ci: string
  user_email: string | null
}

export interface PaymentIntentResult {
  payment: Payment
  qr_url: string
  instructions: string
}

export interface Associate {
  id: string
  user_id: string
  ci: string
  name: string
  phone: string | null
  relation: FamilyRelation
  date_of_birth: string | null
  created_at: string
  updated_at: string
}

export interface CarnetData {
  id: string
  user_id: string
  qr_code_data: string | null
  photo_url: string | null
  issued_at: string | null
  expires_at: string | null
  is_valid: boolean
  created_at: string
  updated_at: string
}

export interface CarnetWithUser extends CarnetData {
  user_name: string
  user_ci: string
  user_email: string | null
  user_phone: string | null
}

export interface CarnetQR {
  user_id: string
  ci: string
  name: string
  user_type: UserType
  expires_at: string | null
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

export interface AdminDashboardStats {
  total_users: number
  active_users: number
  total_activities: number
  reservations_today: number
  aforo_today: number
  global_capacity: number
  occupancy_percent: number
  revenue_this_month: number
  pending_payments: number
}

export type PreEmployeeStatus = 'pending' | 'activated' | 'rejected'

export interface PreEmployee {
  id: string
  ci: string
  name: string
  company: string
  email: string | null
  phone: string | null
  status: PreEmployeeStatus
  user_id: string | null
  activated_by_user_id: string | null
  imported_at: string
  activated_at: string | null
  created_at: string
}

export interface EmployeeUploadRow {
  ci: string
  name: string
  company: string
  email?: string
  phone?: string
}

export interface EmployeeUploadResult {
  total: number
  imported: number
  skipped: number
  errors: Array<{
    row: number
    ci: string
    reason: string
  }>
}

export interface GeneralReport {
  period_start: string
  period_end: string
  period_days: number
  financial: {
    payments: RevenueReport
    events: {
      total_bookings: number
      confirmed_bookings: number
      cancelled_bookings: number
      pending_payment_bookings: number
      contract_value_cup: number
    }
  }
  users: {
    new_total: number
    new_corporate: number
    new_external: number
    currently_suspended: number
    pending_payments: number
  }
  precarga: {
    total: number
    activated: number
    pending: number
    rejected: number
    conversion_percent: number
  }
  reservations: {
    total: number
    completed: number
    cancelled: number
    no_show: number
    no_show_percent: number
    cancelled_percent: number
  }
  capacity: {
    total_period_capacity: number
    total_reserved: number
    overall_occupancy_percent: number
  }
  top_activities: {
    activity_id: string
    activity_name: string
    total_reserved: number
    reservation_count: number
  }[]
  top_companies: {
    company_id: string
    company_name: string
    total_reserved: number
    active_members: number
  }[]
}

export interface CompanySummary {
  id: string
  name: string
  is_active: boolean
  created_at: string
  total_users: number
  active_users: number
  suspended_users: number
  pending_payment_users: number
  pending_activation_users: number
  total_associates: number
  total_members: number
}

export interface CompanyMember {
  id: string
  ci: string
  name: string
  email: string | null
  phone: string | null
  user_type: string
  user_status: UserStatus
  profile_photo_url: string | null
  created_at: string
  associate_count: number
}

export interface CompanyAssociate {
  id: string
  titular_id: string
  titular_name: string
  titular_ci: string
  ci: string
  name: string
  phone: string | null
  relation: string
  date_of_birth: string | null
}

export interface CompanyDetail {
  company: {
    id: string
    name: string
    is_active: boolean
  }
  members: CompanyMember[]
  associates: CompanyAssociate[]
}

export interface AdminUserListResponse {
  users: User[]
  total: number
}

export interface HrUserRecord {
  id: string
  ci: string
  name: string
  email: string | null
  phone: string | null
  user_type: UserType
  user_status: UserStatus
  company_id: string | null
  company_name: string | null
  created_at: string
}

export interface HrUserListResponse {
  users: HrUserRecord[]
  total: number
}

export interface HrUserStatusReportRow {
  company_id: string | null
  company_name: string
  user_type: UserType
  user_status: UserStatus
  total: number
}

export interface OccupancyReportRow {
  activity_id: string
  activity_name: string
  category_name: string | null
  capacity: number
  total_reserved: number
  occupancy_percent: number
  reservation_count: number
  date: string | null
}

export interface RevenueReport {
  total_cup: number
  subscription_count: number
  per_visit_count: number
  by_plan: {
    plan_name: string
    duration_months: number
    count: number
    total_cup: number
  }[]
  period_start: string
  period_end: string
}

export interface PaymentsDayRow {
  date: string
  validated_count: number
  payers_count: number
  subscription_count: number
  per_visit_count: number
  subscription_cup: number
  per_visit_cup: number
  total_cup: number
  pending_count: number
  rejected_count: number
}

export interface PaymentsByDayReport {
  period_start: string
  period_end: string
  days: PaymentsDayRow[]
  totals: {
    validated_count: number
    subscription_count: number
    per_visit_count: number
    subscription_cup: number
    per_visit_cup: number
    total_cup: number
    pending_count: number
    rejected_count: number
  }
}

export interface LocationCapacityRow {
  location: string
  activity_count: number
  daily_capacity: number
  period_capacity: number
  total_reserved: number
  reservation_count: number
  available: number
  occupancy_percent: number
  event_bookings: number
  event_guests: number
}

export interface CapacityReport {
  period_start: string
  period_end: string
  period_days: number
  locations: LocationCapacityRow[]
  summary: {
    most_used: string | null
    least_used: string | null
    total_period_capacity: number
    total_reserved: number
    overall_occupancy_percent: number
  }
}

export interface DailyAttendee {
  reservation_id: string
  user_id: string
  user_name: string
  user_ci: string
  user_type: 'corporate' | 'external'
  company_name: string | null
  quantity: number
  status: string
  attended_at: string | null
  created_by_name: string | null
}

export interface DailyActivityReport {
  activity_id: string
  activity_name: string
  category_name: string | null
  location: string | null
  capacity: number
  total_reserved: number
  available: number
  occupancy_percent: number
  reservation_count: number
  no_show_count: number
  attendees: DailyAttendee[]
}

export interface DailyEventReport {
  id: string
  event_name: string
  location: string
  user_name: string
  user_ci: string
  guest_count: number
  status: string
  total_price_cup: number
  payment_status: string | null
}

export interface DailyReport {
  date: string
  global_capacity: number
  total_aforo: number
  occupancy_percent: number
  reservations_by_status: Record<string, number>
  corporate_reservations: number
  external_reservations: number
  activities: DailyActivityReport[]
  events: DailyEventReport[]
}

export interface ActivityAvailability {
  id: string
  name: string
  category_name: string | null
  capacity: number
  reserved_today: number
  remaining: number
}

export interface ReceptionTodayVisit {
  id: string
  kind: 'vip' | 'walk_in' | 'associate'
  responsible_name: string
  responsible_ci: string | null
  partner_count: number
  headcount: number
  amount_cup: number | null
  payment_method: string | null
  created_by_name: string | null
  created_at: string
}

export interface ReceptionToday {
  date: string
  global_capacity: number
  total_today: number
  reservations_aforo: number
  visits_aforo: number
  remaining_today: number
  reservation_count: number
  occupancy_percent: number
  activities: ActivityAvailability[]
  visits: ReceptionTodayVisit[]
}

export interface VipUser {
  id: string
  name: string
  ci: string
  partners_count: number
  is_active: boolean
  created_by_user_id: string | null
  created_at: string
  updated_at: string
}

export interface VipListResponse {
  vips: VipUser[]
  total: number
}

export interface ReceptionReservation extends Reservation {
  activity_name?: string
}

export interface CarnetVerificationResult {
  valid: boolean
  reason?: string
  member?: UserProfile
  member_code?: string
  associates?: Associate[]
  today_reservations?: ReceptionReservation[]
}

export type NotificationType =
  | 'account_created'
  | 'user_registered'
  | 'payment_submitted'
  | 'payment_validated'
  | 'payment_rejected'
  | 'subscription_activated'
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'account_suspended'
  | 'account_reactivated'
  | 'reservation_created'
  | 'reservation_cancelled'
  | 'reservation_reminder'
  | 'no_show'

export interface AppNotification {
  id: string
  user_id: string | null
  type: NotificationType
  title: string
  message: string | null
  channel: 'in_app' | 'email' | 'telegram' | 'sms'
  status: 'sent' | 'failed' | 'pending'
  read_at: string | null
  sent_at: string | null
  created_at: string
}

export interface NotificationListResponse {
  notifications: AppNotification[]
  unread_count: number
}

export interface CreateExternalUserInput {
  ci: string
  name: string
  phone?: string
}

/** Capabilities an admin can grant to a custom internal role. */
export type StaffPermission =
  | 'reception'
  | 'external_payments'
  | 'vips'
  | 'reports'
  | 'users'

export interface StaffRole {
  id: string
  name: string
  permissions: string[]
  is_core: boolean
  description: string | null
  created_at: string
  user_count: number
}

export interface StaffAccount {
  id: string
  ci: string
  email: string | null
  name: string
  user_status: UserStatus
  role_id: string | null
  role_name: string | null
  created_at: string
}
