import type { PoolConfig } from 'pg'
import { env } from './env.js'

export const poolConfig: PoolConfig = {
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  idleTimeoutMillis: 30000,
  // Aiven puede tardar >5s en establecer TLS + auth (sobre todo en frío),
  // por eso el timeout de conexión es configurable y generoso.
  connectionTimeoutMillis: env.DATABASE_CONNECT_TIMEOUT_MS,
  statement_timeout: 10000,
  // A connection left inside an open transaction would keep row locks and
  // block reservations or the daily counter recalculation. Postgres closes it.
  idle_in_transaction_session_timeout: 60000,
  application_name: 'am-social-club-api',
  keepAlive: true,
  // TLS explícito: activo por defecto en producción (Aiven/managed).
  // rejectUnauthorized es configurable (verify-full para CAs de confianza).
  ssl: env.DATABASE_SSL
    ? { rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED }
    : undefined,
}
