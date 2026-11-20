import { pool } from '../connection.js'
import type { Associate, CreateAssociatePayload, UpdateAssociatePayload } from '../../types/associate.js'

export class AssociateQuery {
  static async getById(id: string): Promise<Associate | null> {
    const result = await pool.query(
      'SELECT * FROM associates WHERE id = $1',
      [id]
    )
    return (result.rows[0] as Associate) ?? null
  }

  static async getByCI(ci: string): Promise<Associate | null> {
    const result = await pool.query(
      'SELECT * FROM associates WHERE ci = $1',
      [ci]
    )
    return (result.rows[0] as Associate) ?? null
  }

  static async getByUserId(userId: string): Promise<Associate[]> {
    const result = await pool.query(
      'SELECT * FROM associates WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    )
    return result.rows as Associate[]
  }

  static async countByUserId(userId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM associates WHERE user_id = $1',
      [userId]
    )
    return parseInt(result.rows[0].count as string, 10)
  }

  static async create(payload: CreateAssociatePayload): Promise<Associate> {
    const result = await pool.query(
      `INSERT INTO associates (user_id, ci, name, phone, relation, date_of_birth)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        payload.user_id,
        payload.ci,
        payload.name,
        payload.phone ?? null,
        payload.relation,
        payload.date_of_birth ?? null,
      ]
    )
    return result.rows[0] as Associate
  }

  static async update(id: string, payload: UpdateAssociatePayload): Promise<Associate | null> {
    const fields: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (payload.name !== undefined) {
      fields.push(`name = $${paramIndex++}`)
      values.push(payload.name)
    }
    if (payload.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`)
      values.push(payload.phone)
    }
    if (payload.relation !== undefined) {
      fields.push(`relation = $${paramIndex++}`)
      values.push(payload.relation)
    }
    if (payload.date_of_birth !== undefined) {
      fields.push(`date_of_birth = $${paramIndex++}`)
      values.push(payload.date_of_birth)
    }

    if (fields.length === 0) return null

    values.push(id)
    const result = await pool.query(
      `UPDATE associates SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )
    return (result.rows[0] as Associate) ?? null
  }

  static async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM associates WHERE id = $1',
      [id]
    )
    return (result.rowCount ?? 0) > 0
  }

  static async deleteByUserId(userId: string): Promise<number> {
    const result = await pool.query(
      'DELETE FROM associates WHERE user_id = $1',
      [userId]
    )
    return result.rowCount ?? 0
  }
}
