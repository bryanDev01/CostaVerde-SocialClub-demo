import cron, { type ScheduledTask } from 'node-cron'
import { ReservationService } from '../services/ReservationService.js'

export function startAutoConfirmationTimeout(): ScheduledTask {
  const task = cron.schedule('30 * * * *', async () => {
    console.log('[CRON] Auto-cancel unconfirmed reservations check started')

    try {
      const cancelledCount = await ReservationService.autoCancelUnconfirmed()
      console.log(`[CRON] Auto-cancelled ${cancelledCount} unconfirmed reservations`)
    } catch (error) {
      console.error('[CRON] Failed to auto-cancel unconfirmed reservations:', error)
    }

    console.log('[CRON] Auto-cancel check completed')
  })

  console.log('[CRON] Auto-confirmation timeout scheduled (at :30 every hour)')
  return task
}
