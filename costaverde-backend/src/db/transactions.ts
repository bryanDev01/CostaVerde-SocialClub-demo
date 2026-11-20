import type { PoolClient } from 'pg'
import { pool } from './connection.js'

type TransactionCallback<T> = (client: PoolClient) => Promise<T>

export async function withTransaction<T>(
  callback: TransactionCallback<T>,
  isolationLevel: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE' = 'READ COMMITTED'
): Promise<T> {
  const client = await pool.connect()

  try {
    await client.query(`BEGIN TRANSACTION ISOLATION LEVEL ${isolationLevel}`)
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function withSerializableTransaction<T>(
  callback: TransactionCallback<T>
): Promise<T> {
  return withTransaction(callback, 'SERIALIZABLE')
}
