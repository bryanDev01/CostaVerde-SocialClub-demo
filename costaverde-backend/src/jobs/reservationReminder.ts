import cron, { type ScheduledTask } from 'node-cron'
import { ReservationService } from '../services/ReservationService.js'

export function startReservationReminder(): ScheduledTask {
  const task = cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Reservation reminder check started')

    try {
      const confirmed = await ReservationService.getConfirmedWithin48h()
      console.log(`[CRON] Found ${confirmed.length} confirmed reservations within 48h`)

      for (const reservation of confirmed) {
        try {
          await ReservationService.transitionToPendingReminder(reservation.id)
          console.log(`[CRON] Transitioned reservation ${reservation.id} to pending_reminder`)
        } catch (error) {
          console.error(`[CRON] Failed to transition reservation ${reservation.id}:`, error)
        }
      }
    } catch (error) {
      console.error('[CRON] Failed to find confirmed reservations:', error)
    }

    try {
      const pending = await ReservationService.getPendingReminders()
      console.log(`[CRON] Found ${pending.length} reservations pending reminder notification`)

      for (const reservation of pending) {
        try {
          await ReservationService.notifyPendingReminder(reservation.id)
          console.log(`[CRON] Reminder notified for reservation ${reservation.id}`)
        } catch (error) {
          console.error(`[CRON] Failed to send reminder for reservation ${reservation.id}:`, error)
        }
      }
    } catch (error) {
      console.error('[CRON] Failed to process reservation reminders:', error)
    }

    console.log('[CRON] Reservation reminder check completed')
  })

  console.log('[CRON] Reservation reminder scheduled (hourly)')
  return task
}
