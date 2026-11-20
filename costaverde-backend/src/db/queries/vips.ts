import { pool } from '../connection.js'
import type {
  VipUser,
  CreateVipPayload,
  UpdateVipPayload,
} from '../../types/vip.js'

export interface VipListFilters {
  search?: string
  isActive?: boolean
  page: number
  limit: number
}

export class VipQuery {
  static async getById(id: string): Promise<VipUser | null> {
    const result = await pool.query<VipUser>(
      'SELECT * FROM vip_users WHERE id = $1',
      [id]
    )
    return result.rows[0] ?? null
  }

  static async getByCi(ci: string): Promise<VipUser | null> {
    const result = await pool.query<VipUser>(
      'SELECT * FROM vip_users WHERE ci = $1',
      [ci]
    )
    return result.rows[0] ?? null
  }

  static async list(
    filters: VipListFilters
  ): Promise<{ vips: VipUser[]; total: number }> {
    const conditions: string[] = []
    const values: unknown[] = []

    if (filters.search) {
      values.push(`%${filters.search}%`)
      conditions.push(`(ci ILIKE $${values.length} OR name ILIKE $${values.length})`)
    }
    if (filters.isActive !== undefined) {
      values.push(filters.isActive)
      conditions.push(`is_active = $${values.length}`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countResult = await pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM vip_users ${whereClause}`,
      values
    )
    const total = parseInt(countResult.rows[0].total, 10)

    const offset = (filters.page - 1) * filters.limit
    const result = await pool.query<VipUser>(
      `SELECT * FROM vip_users ${whereClause}
       ORDER BY name ASC, id
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, filters.limit, offset]
    )

    return { vips: result.rows, total }
  }

  static async search(query: string, limit = 20): Promise<VipUser[]> {
    const result = await pool.query<VipUser>(
      `SELECT * FROM vip_users
       WHERE is_active = true
         AND (
           ci ILIKE $1
           OR translate(lower(name), 'áéíóúüñ', 'aeiouun')
              LIKE translate(lower($1), 'áéíóúüñ', 'aeiouun')
         )
       ORDER BY name ASC
       LIMIT $2`,
      [`%${query}%`, limit]
    )
    return result.rows
  }

  static async create(
    payload: CreateVipPayload,
    createdByUserId: string
  ): Promise<VipUser> {
    const result = await pool.query<VipUser>(
      `INSERT INTO vip_users (name, ci, partners_count, created_by_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [payload.name, payload.ci, payload.partners_count, createdByUserId]
    )
    return result.rows[0]
  }

  static async update(id: string, payload: UpdateVipPayload): Promise<VipUser | null> {
    const fields: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (payload.name !== undefined) {
      fields.push(`name = $${paramIndex++}`)
      values.push(payload.name)
    }
    if (payload.ci !== undefined) {
      fields.push(`ci = $${paramIndex++}`)
      values.push(payload.ci)
    }
    if (payload.partners_count !== undefined) {
      fields.push(`partners_count = $${paramIndex++}`)
      values.push(payload.partners_count)
    }
    if (payload.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`)
      values.push(payload.is_active)
    }
    if (fields.length === 0) return VipQuery.getById(id)

    fields.push('updated_at = NOW()')
    values.push(id)
    const result = await pool.query<VipUser>(
      `UPDATE vip_users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )
    return result.rows[0] ?? null
  }
}
