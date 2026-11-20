import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) process.loadEnvFile(envPath)

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.DB_URL_AV
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: /sslmode=require/.test(DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
})

async function q(text, params) {
  const r = await pool.query(text, params)
  return r.rows
}

async function main() {
  console.log('=== ROLES ===')
  console.log(await q('SELECT id, name FROM roles ORDER BY name'))

  console.log('\n=== USERS (login users) ===')
  console.log(
    await q(`
      SELECT u.email, u.ci, u.name, u.user_type, u.user_status,
             r.name AS role, c.name AS company,
             CASE WHEN u.password_hash IS NULL THEN 'NO_PASSWORD' ELSE 'HASHED' END AS pass_state
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN companies c ON c.id = u.company_id
      ORDER BY u.email
    `)
  )

  console.log('\n=== PRE-EMPLOYEES (HR precarga) ===')
  console.log(await q('SELECT ci, name, company, status FROM pre_employees ORDER BY ci'))

  console.log('\n=== SUBSCRIPTION PLANS ===')
  console.log(
    await q('SELECT id, name, duration_months, price_cup FROM subscription_plans ORDER BY duration_months')
  )

  console.log('\n=== ACTIVITY CATEGORIES ===')
  console.log(await q('SELECT id, name, is_active FROM activity_categories ORDER BY name'))

  console.log('\n=== ACTIVITIES ===')
  console.log(
    await q('SELECT name, location, capacity, reserved_count, is_active, image_url FROM activities ORDER BY name')
  )

  console.log('\n=== EVENTS ===')
  try {
    console.log(await q('SELECT name FROM events ORDER BY name LIMIT 20'))
  } catch (e) {
    console.log('table events not present:', e.message)
  }

  console.log('\n=== COUNTS ===')
  console.log(
    await q(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM subscriptions) AS subscriptions,
        (SELECT COUNT(*) FROM reservations) AS reservations,
        (SELECT COUNT(*) FROM payments) AS payments,
        (SELECT COUNT(*) FROM associates) AS associates,
        (SELECT COUNT(*) FROM notifications) AS notifications
    `)
  )
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exitCode = 1
  })
  .finally(() => pool.end())