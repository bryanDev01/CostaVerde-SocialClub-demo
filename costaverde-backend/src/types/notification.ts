export type NotificationChannel = 'in_app' | 'email' | 'telegram' | 'sms'

export type NotificationStatus = 'sent' | 'failed' | 'pending'

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

export interface Notification {
  id: string
  user_id: string | null
  type: NotificationType
  title: string
  message: string | null
  channel: NotificationChannel
  status: NotificationStatus
  read_at: Date | null
  sent_at: Date | null
  created_at: Date
}

export interface CreateNotificationPayload {
  user_id: string
  type: NotificationType
  title: string
  message?: string | null
  channel?: NotificationChannel
}
