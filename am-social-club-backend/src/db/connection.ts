import pg from 'pg'
import { poolConfig } from '../config/database.js'

const { Pool } = pg

export const pool = new Pool(poolConfig)

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err)
})

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    client.release()
    console.log('Database connected:', result.rows[0].now)
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

export async function closePool(): Promise<void> {
  await pool.end()
}
