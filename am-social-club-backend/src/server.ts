import { app } from './app.js'
import { env } from './config/env.js'
import { testConnection, closePool } from './db/connection.js'
import { ActivityQuery, RESERVABLE_SERVICES } from './db/queries/activities.js'
import { startSuspensionCheck } from './jobs/suspensionCheck.js'
import { startReservationReminder } from './jobs/reservationReminder.js'
import { startAutoConfirmationTimeout } from './jobs/autoConfirmationTimeout.js'

// Safety net: a dropped database connection emits errors on clients that are
// already checked out. Log them and keep serving instead of taking the API down.
process.on('uncaughtException', (error) => {
  console.error('[SAFETY] Uncaught exception (server kept running):', error)
})
process.on('unhandledRejection', (reason) => {
  console.error('[SAFETY] Unhandled promise rejection (server kept running):', reason)
})

async function start(): Promise<void> {
  const dbOk = await testConnection()
  if (!dbOk) {
    console.error('Failed to connect to database. Exiting.')
    process.exit(1)
  }

  // Only the reservable services stay active; others are hidden. Idempotent.
  await ActivityQuery.syncReservableServices(RESERVABLE_SERVICES)

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT} [${env.NODE_ENV}]`)
  })

  const suspensionJob = startSuspensionCheck()
  const reminderJob = startReservationReminder()
  const autoCancelJob = startAutoConfirmationTimeout()

  async function shutdown(signal: string): Promise<void> {
    console.log(`\n${signal} received. Shutting down gracefully...`)

    suspensionJob.stop()
    reminderJob.stop()
    autoCancelJob.stop()

    server.close(async () => {
      await closePool()
      console.log('Server closed.')
      process.exit(0)
    })

    setTimeout(() => {
      console.error('Forced shutdown after timeout.')
      process.exit(1)
    }, 10000)
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM') })
  process.on('SIGINT', () => { void shutdown('SIGINT') })
}

start().catch((err) => {
  console.error('Startup error:', err)
  process.exit(1)
})
