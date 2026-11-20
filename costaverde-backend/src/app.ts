import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { globalLimiter } from './middleware/rateLimiter.js'
import { authRouter } from './api/auth.js'
import { hrRouter } from './api/hr.js'
import { usersRouter } from './api/users.js'
import { employeesRouter } from './api/employees.js'
import { associatesRouter } from './api/associates.js'
import { activitiesRouter } from './api/activities.js'
import { reservationsRouter } from './api/reservations.js'
import { paymentsRouter } from './api/payments.js'
import { subscriptionsRouter } from './api/subscriptions.js'
import { adminPaymentsRouter } from './api/admin/payments.js'
import { adminUsersRouter } from './api/admin/users.js'
import { adminReportsRouter } from './api/admin/reports.js'
import { adminCompaniesRouter } from './api/admin/companies.js'
import { adminVipsRouter } from './api/admin/vips.js'
import { adminExternalPaymentsRouter } from './api/admin/externalPayments.js'
import { adminRolesRouter } from './api/admin/roles.js'
import { adminStaffRouter } from './api/admin/staff.js'
import { carnetRouter } from './api/carnet.js'
import { receptionRouter } from './api/reception.js'
import { notificationsRouter } from './api/notifications.js'

export const app = express()

// Behind a reverse proxy (nginx), so rate limiters key off real client IPs.
app.set('trust proxy', 1)

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'none'"],
      upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  // Frontend (other origin) must be able to load /uploads images via <img>.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()'
  )
  next()
})
// CORS: accept a comma-separated list. In development also accept any
// localhost/127.0.0.1/private-LAN origin (any port) so the app works from
// 127.0.0.1, a phone over the LAN, or an alternate dev port without a
// confusing "Failed to fetch" caused by the browser blocking the response.
const configuredOrigins = env.CORS_ORIGIN
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const DEV_ORIGIN_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser clients (curl, server-to-server) with no Origin.
    if (!origin) return callback(null, true)
    if (configuredOrigins.includes(origin)) return callback(null, true)
    if (env.NODE_ENV !== 'production' && DEV_ORIGIN_PATTERN.test(origin)) {
      return callback(null, true)
    }
    return callback(null, false)
  },
  credentials: true,
}))

app.use('/api/employees/bulk-upload', express.json({ limit: '2mb' }))
app.use('/api/users/me/photo', express.json({ limit: '2mb' }))
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// Uploaded files (profile photos), served from <project root>/uploads
const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
app.use('/uploads', express.static(path.join(projectRoot, 'uploads')))

// Lightweight diagnostics for the portfolio demo: which database is this
// instance actually talking to (host only, no credentials).
app.get('/api/health', (_req: Request, res: Response) => {
  let dbHost = 'unknown'
  try {
    dbHost = new URL(env.DATABASE_URL).hostname
  } catch {
    // malformed URL: keep 'unknown'
  }
  res.json({
    success: true,
    data: { status: 'ok', dbHost, time: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  })
})

app.use(globalLimiter)

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in (err as { body?: unknown })) {
    res.status(400).json({
      success: false,
      error: 'Malformed JSON in request body',
      timestamp: new Date().toISOString(),
    })
    return
  }
  next(err)
})

interface HealthResponse {
  success: boolean
  data: { status: string; uptime: number }
  timestamp: string
}

app.get('/health', (_req: Request, res: Response<HealthResponse>) => {
  res.json({
    success: true,
    data: { status: 'ok', uptime: process.uptime() },
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/auth', authRouter)
app.use('/api/hr', hrRouter)
app.use('/api/users', usersRouter)
app.use('/api/employees', employeesRouter)
app.use('/api/associates', associatesRouter)
app.use('/api/activities', activitiesRouter)
app.use('/api/reservations', reservationsRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/subscriptions', subscriptionsRouter)
app.use('/api/admin/payments', adminPaymentsRouter)
app.use('/api/admin/users', adminUsersRouter)
app.use('/api/admin/reports', adminReportsRouter)
app.use('/api/admin/companies', adminCompaniesRouter)
app.use('/api/admin/vips', adminVipsRouter)
app.use('/api/admin/external-payments', adminExternalPaymentsRouter)
app.use('/api/admin/roles', adminRolesRouter)
app.use('/api/admin/staff', adminStaffRouter)
app.use('/api/carnet', carnetRouter)
app.use('/api/reception', receptionRouter)
app.use('/api/notifications', notificationsRouter)

app.use(notFoundHandler)
app.use(errorHandler)
