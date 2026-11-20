// Minimal migration runner: applies SQL files in order and tracks them in
// schema_migrations so re-runs are safe. Usage: npm run migrate
import { existsSync } from 'node:fs'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  process.loadEnvFile(envPath)
}

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.DB_URL_AV
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Configure the backend .env file first.')
  process.exit(1)
}

const MIGRATIONS_DIR = join(__dirname, '..', 'src', 'db', 'migrations')

async function main() {
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: /sslmode=require/.test(DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
  })

  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const applied = new Set(
      (await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name)
    )

    const isProduction = process.env.NODE_ENV === 'production'
    const seedFiles = ['004_seed_dev.sql', '005_external_user_support.sql']

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .filter((f) => !(isProduction && seedFiles.includes(f)))
      .sort()

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`= ${file} (already applied)`)
        continue
      }
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
        console.log(`+ ${file} applied`)
      } catch (error) {
        await client.query('ROLLBACK')
        console.error(`! ${file} FAILED:`, error instanceof Error ? error.message : error)
        process.exitCode = 1
        break
      }
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error('Migration runner error:', error)
  process.exit(1)
})
