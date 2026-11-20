import cron, { type ScheduledTask } from 'node-cron'
import { SubscriptionService } from '../services/SubscriptionService.js'

export function startSuspensionCheck(): ScheduledTask {
  const task = cron.schedule('1 0 * * *', async () => {
    console.log('[CRON] Suspension check started')

    try {
      const expiredCount = await SubscriptionService.processExpiredSubscriptions()
      console.log(`[CRON] Marked ${expiredCount} subscriptions as expired`)
    } catch (error) {
      console.error('[CRON] Failed to process expired subscriptions:', error)
    }

    try {
      const suspendedCount = await SubscriptionService.suspendUsersPastGracePeriod()
      console.log(`[CRON] Suspended ${suspendedCount} users past grace period`)
    } catch (error) {
      console.error('[CRON] Failed to suspend users:', error)
    }

    console.log('[CRON] Suspension check completed')
  })

  console.log('[CRON] Suspension check scheduled (daily at 00:01)')
  return task
}
