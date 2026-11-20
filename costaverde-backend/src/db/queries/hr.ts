import { pool } from '../connection.js'
import type { UserStatus, UserType } from '../../types/user.js'

export interface HrUserRow {
  id: string
  ci: string
  name: string
  email: string | null
  phone: string | null
  user_type: UserType
  user_status: UserStatus
  company_id: string | null
  company_name: string | null
  created_at: Date
}

export interface HrUserStatusRow {
  company_id: string | null
  company_name: string
  user_type: UserType
  user_status: UserStatus
  total: string
}

export interface HrUserFilters {
  companyId?: string | 'none'
  status?: UserStatus
  search?: string
  page: number
  limit: number
}

function buildConditions(filters: HrUserFilters): {
  conditions: string[]
  values: unknown[]
} {
  const conditions = [`r.name = 'user'`, `u.user_type <> 'external'`]
  const values: unknown[] = []

  if (filters.companyId === 'none') {
    conditions.push('u.company_id IS NULL')
  } else if (filters.companyId) {
    values.push(filters.companyId)
    conditions.push(`u.company_id = $${values.length}`)
  }

  if (filters.status) {
    values.push(filters.status)
    conditions.push(`u.user_status = $${values.length}`)
  }

  if (filters.search) {
    values.push(`%${filters.search}%`)
    conditions.push(`(u.ci ILIKE $${values.length} OR u.name ILIKE $${values.length} OR u.email ILIKE $${values.length})`)
  }

  return { conditions, values }
}

export class HrQuery {
  static async listUsers(
    filters: HrUserFilters
  ): Promise<{ users: HrUserRow[]; total: number }> {
    const { conditions, values } = buildConditions(filters)
    const whereClause = `WHERE ${conditions.join(' AND ')}`
    const countResult = await pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM users u
       JOIN roles r ON r.id = u.role_id
       ${whereClause}`,
      values
    )
    const total = Number.parseInt(countResult.rows[0].total, 10)
    const offset = (filters.page - 1) * filters.limit
    const result = await pool.query<HrUserRow>(
      `SELECT u.id, u.ci, u.name, u.email, u.phone, u.user_type, u.user_status,
              u.company_id, c.name AS company_name, u.created_at
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN companies c ON c.id = u.company_id
       ${whereClause}
       ORDER BY u.created_at DESC, u.id
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, filters.limit, offset]
    )

    return { users: result.rows, total }
  }

  static async getUserStatusReport(
    companyId?: string | 'none'
  ): Promise<HrUserStatusRow[]> {
    const conditions = [`r.name = 'user'`, `u.user_type <> 'external'`]
    const values: unknown[] = []

    if (companyId === 'none') {
      conditions.push('u.company_id IS NULL')
    } else if (companyId) {
      values.push(companyId)
      conditions.push(`u.company_id = $${values.length}`)
    }

    const result = await pool.query<HrUserStatusRow>(
      `SELECT u.company_id, COALESCE(c.name, 'Sin empresa') AS company_name,
              u.user_type, u.user_status, COUNT(*) AS total
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY u.company_id, c.name, u.user_type, u.user_status
       ORDER BY company_name, u.user_type, u.user_status`,
      values
    )
    return result.rows
  }
}