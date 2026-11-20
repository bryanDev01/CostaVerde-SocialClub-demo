import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Carga el archivo .env del backend (raíz del paquete) si existe.
// Permite alternar entre Docker local y Aiven cambiando solo ese archivo.
const envFilePath = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath)
}

interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test'
  PORT: number
  DATABASE_URL: string
  DATABASE_POOL_MAX: number
  DATABASE_CONNECT_TIMEOUT_MS: number
  DATABASE_SSL: boolean
  DATABASE_SSL_REJECT_UNAUTHORIZED: boolean
  JWT_SECRET: string
  JWT_EXPIRES_IN: string
  /** IANA timezone used for every club-local date decision. */
  CLUB_TIMEZONE: string
  /** Display name of the club used in user-facing notifications. */
  CLUB_NAME: string
  SUBSCRIPTION_PRICE_1M: number
  SUBSCRIPTION_PRICE_3M: number
  SUBSCRIPTION_PRICE_6M: number
  SUBSCRIPTION_PRICE_12M: number
  GRACE_PERIOD_DAYS: number
  MAX_ASSOCIATES: number
  MAX_RESERVATIONS_PER_WEEK: number
  GLOBAL_DAILY_CAPACITY: number
  CORS_ORIGIN: string
  TRANSFERMOVIL_QR_URL: string
  /** Dev only: expose the reset link in the API response when email is not delivered. */
  PASSWORD_RESET_DEV_URL: boolean
}

function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getEnvNumber(key: string, fallback?: number): number {
  const raw = process.env[key]
  if (raw !== undefined) {
    const parsed = Number(raw)
    if (Number.isNaN(parsed)) {
      throw new Error(`Environment variable ${key} must be a valid number, got: ${raw}`)
    }
    return parsed
  }
  if (fallback !== undefined) return fallback
  throw new Error(`Missing required environment variable: ${key}`)
}

function validateNodeEnv(value: string): 'development' | 'production' | 'test' {
  const allowed = ['development', 'production', 'test'] as const
  if (!allowed.includes(value as typeof allowed[number])) {
    throw new Error(`NODE_ENV must be one of: ${allowed.join(', ')}`)
  }
  return value as typeof allowed[number]
}

const nodeEnvValue = validateNodeEnv(getEnvVar('NODE_ENV', 'development'))

export const env: EnvConfig = {
  NODE_ENV: nodeEnvValue,
  PORT: getEnvNumber('PORT', 4000),
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  DATABASE_POOL_MAX: getEnvNumber('DATABASE_POOL_MAX', 20),
  DATABASE_CONNECT_TIMEOUT_MS: getEnvNumber('DATABASE_CONNECT_TIMEOUT_MS', 30000),
  DATABASE_SSL:
    process.env.DATABASE_SSL === 'true' ||
    (process.env.DATABASE_SSL !== 'false' && nodeEnvValue === 'production'),
  DATABASE_SSL_REJECT_UNAUTHORIZED: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
  JWT_SECRET: getEnvVar('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '7d'),
  CLUB_TIMEZONE: getEnvVar('CLUB_TIMEZONE', 'America/Havana'),
  CLUB_NAME: getEnvVar('CLUB_NAME', 'Club Social Costa Verde'),
  SUBSCRIPTION_PRICE_1M: getEnvNumber('SUBSCRIPTION_PRICE_1M', 150),
  SUBSCRIPTION_PRICE_3M: getEnvNumber('SUBSCRIPTION_PRICE_3M', 450),
  SUBSCRIPTION_PRICE_6M: getEnvNumber('SUBSCRIPTION_PRICE_6M', 900),
  SUBSCRIPTION_PRICE_12M: getEnvNumber('SUBSCRIPTION_PRICE_12M', 1440),
  GRACE_PERIOD_DAYS: getEnvNumber('GRACE_PERIOD_DAYS', 5),
  MAX_ASSOCIATES: getEnvNumber('MAX_ASSOCIATES', 6),
  MAX_RESERVATIONS_PER_WEEK: getEnvNumber('MAX_RESERVATIONS_PER_WEEK', 2),
  GLOBAL_DAILY_CAPACITY: getEnvNumber('GLOBAL_DAILY_CAPACITY', 500),
  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
  TRANSFERMOVIL_QR_URL: getEnvVar('TRANSFERMOVIL_QR_URL', ''),
  PASSWORD_RESET_DEV_URL:
    process.env.PASSWORD_RESET_DEV_URL === 'true' && nodeEnvValue !== 'production',
}
