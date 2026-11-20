import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) process.loadEnvFile(envPath)

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.DB_URL_AV
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: /sslmode=require/.test(DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
})

const demoPasswordHash = '$2b$10$J2xev0z.aEG7DgAIzF0xDO/rd/gfkwh9zlVdeFaOFgO2jST5hLMy6'

async function main() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // HR is a global system account and has no company assignment.
    await client.query(
      `INSERT INTO users (ci, email, password_hash, name, phone, company_id, user_type, user_status, role_id)
       SELECT '60000001', 'hr@demo.costaverde.cu', $1, 'HR Manager', '66554433', NULL, 'corporate', 'active', r.id
       FROM roles r
       WHERE r.name = 'hr'
         AND NOT EXISTS (SELECT 1 FROM users WHERE ci = '60000001' OR email = 'hr@demo.costaverde.cu')`,
      [demoPasswordHash]
    )

    // Director is a global system account and has no company assignment.
    await client.query(
      `INSERT INTO users (ci, email, password_hash, name, phone, company_id, user_type, user_status, role_id)
       SELECT '60000002', 'director@demo.costaverde.cu', $1, 'Director User', '77889900', NULL, 'corporate', 'active', r.id
       FROM roles r
       WHERE r.name = 'director'
         AND NOT EXISTS (SELECT 1 FROM users WHERE ci = '60000002' OR email = 'director@demo.costaverde.cu')`,
      [demoPasswordHash]
    )

    // Pending pre-employees so the HR precarga -> register (RF-002) flow can be demoed
    await client.query(
      `INSERT INTO pre_employees (ci, name, company, email, phone, status)
       VALUES
         ('50000011', 'New Employee One', 'Grupo Empresarial Marina', 'new1@demo.costaverde.cu', '70000001', 'pending'),
         ('50000012', 'New Employee Two', 'Grupo Empresarial Marina', 'new2@demo.costaverde.cu', '70000002', 'pending'),
         ('50000013', 'New Employee Three', 'Grupo Empresarial Marina', 'new3@demo.costaverde.cu', '70000003', 'pending')
       ON CONFLICT (ci) DO NOTHING`
    )

    await client.query('COMMIT')

    const { rows: users } = await client.query(
      `SELECT u.email, u.ci, u.name, u.user_type, u.user_status, r.name AS role,
              CASE WHEN u.password_hash IS NULL THEN 'SIN_PASSWORD' ELSE 'password' END AS password
       FROM users u LEFT JOIN roles r ON r.id = u.role_id
       ORDER BY u.ci`
    )
    console.log('USERS:', JSON.stringify(users, null, 2))

    const { rows: pre } = await client.query('SELECT ci, name, company, status FROM pre_employees ORDER BY ci')
    console.log('PRE_EMPLOYEES:', JSON.stringify(pre, null, 2))
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error('Setup failed:', error)
  process.exit(1)
})