import { pool } from '../connection.js'
import { RoleQuery } from './roles.js'
import type { User, SafeUser, UserProfile, UserStatus, CreateUserPayload, UpdateUserPayload } from '../../types/user.js'

const SAFE_COLUMNS = `id, ci, email, name, phone, company_id, user_type, user_status,
  profile_photo_url, role_id, created_by_user_id, created_at, updated_at`

export interface StaffAccount {
  id: string
  ci: string
  email: string | null
  name: string
  user_status: UserStatus
  role_id: string | null
  role_name: string | null
  created_at: Date
}

export interface MemberSearchRow {
  id: string
  name: string
  ci: string
  company_name: string | null
  associates_count: number
}

export class UserQuery {
  static async getById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    )
    return (result.rows[0] as User) ?? null
  }

  static async getSafeById(id: string): Promise<SafeUser | null> {
    const result = await pool.query(
      `SELECT ${SAFE_COLUMNS} FROM users WHERE id = $1`,
      [id]
    )
    return (result.rows[0] as SafeUser) ?? null
  }

  static async getProfileById(id: string): Promise<UserProfile | null> {
    const result = await pool.query(
      `SELECT u.id, u.ci, u.email, u.name, u.phone, u.company_id,
              c.name as company_name,
              u.user_type, u.user_status, u.profile_photo_url,
              r.name as role_name, r.permissions as role_permissions, u.created_at
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.id = $1`,
      [id]
    )
    return (result.rows[0] as UserProfile) ?? null
  }

  static async getProfileByEmail(email: string): Promise<UserProfile | null> {
    const result = await pool.query(
      `SELECT u.id, u.ci, u.email, u.name, u.phone, u.company_id,
              c.name as company_name,
              u.user_type, u.user_status, u.profile_photo_url,
              r.name as role_name, u.created_at
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.email = $1`,
      [email]
    )
    return (result.rows[0] as UserProfile) ?? null
  }

  static async getByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )
    return (result.rows[0] as User) ?? null
  }

  static async getByCI(ci: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE ci = $1',
      [ci]
    )
    return (result.rows[0] as User) ?? null
  }

  static async getByCIAndType(ci: string, userType: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE ci = $1 AND user_type = $2',
      [ci, userType]
    )
    return (result.rows[0] as User) ?? null
  }

  static async search(filters: {
    query: string
    limit?: number
  }): Promise<SafeUser[]> {
    const limit = Math.min(filters.limit ?? 10, 20)
    const result = await pool.query(
      `SELECT ${SAFE_COLUMNS} FROM users 
       WHERE ci ILIKE $1 OR name ILIKE $1
       ORDER BY name ASC
       LIMIT $2`,
      [`%${filters.query}%`, limit]
    )
    return result.rows as SafeUser[]
  }

  /** Corporate members (associates) for the reception entrance desk. */
  static async searchMembers(query: string, limit = 10): Promise<MemberSearchRow[]> {
    const result = await pool.query<MemberSearchRow>(
      `SELECT u.id, u.name, u.ci,
              c.name AS company_name,
              (SELECT COUNT(*)::int FROM associates a WHERE a.user_id = u.id) AS associates_count
       FROM users u
       JOIN roles r ON r.id = u.role_id AND r.name = 'user'
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.user_type = 'corporate'
         AND u.user_status = 'active'
         AND (
           u.ci ILIKE $1
           OR translate(lower(u.name), 'áéíóúüñ', 'aeiouun')
              LIKE translate(lower($1), 'áéíóúüñ', 'aeiouun')
         )
       ORDER BY u.name ASC
       LIMIT $2`,
      [`%${query}%`, Math.min(limit, 20)]
    )
    return result.rows
  }

  static async getByCompanyId(companyId: string): Promise<SafeUser[]> {
    const result = await pool.query(
      `SELECT ${SAFE_COLUMNS} FROM users WHERE company_id = $1 ORDER BY created_at DESC`,
      [companyId]
    )
    return result.rows as SafeUser[]
  }

  static async getAll(): Promise<SafeUser[]> {
    const result = await pool.query(
      `SELECT ${SAFE_COLUMNS} FROM users ORDER BY created_at DESC`
    )
    return result.rows as SafeUser[]
  }

  static async listAll(filters: {
    status?: UserStatus
    user_type?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<{ users: SafeUser[]; total: number }> {
    // Only member accounts (role 'user': corporate and external). Staff (admin, hr,
    // receptionist, internal roles) are listed separately via /api/admin/staff.
    // External visitors are not app users: they live in the reception records.
    const conditions: string[] = [
      `role_id = (SELECT id FROM roles WHERE name = 'user')`,
      `user_type <> 'external'`,
    ]
    const values: unknown[] = []
    let paramIndex = 1

    if (filters.status) {
      conditions.push(`user_status = $${paramIndex++}`)
      values.push(filters.status)
    }
    if (filters.user_type) {
      conditions.push(`user_type = $${paramIndex++}`)
      values.push(filters.user_type)
    }
    if (filters.search) {
      conditions.push(`(ci ILIKE $${paramIndex} OR name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`)
      values.push(`%${filters.search}%`)
      paramIndex++
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      values
    )
    const total = parseInt(countResult.rows[0].total, 10)

    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 50, 200)
    const offset = (page - 1) * limit

    const result = await pool.query(
      `SELECT ${SAFE_COLUMNS} FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, limit, offset]
    )

    return { users: result.rows as SafeUser[], total }
  }

  static async create(payload: CreateUserPayload): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (ci, email, password_hash, name, phone, company_id, user_type, user_status, role_id, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        payload.ci,
        payload.email ?? null,
        payload.password_hash ?? null,
        payload.name,
        payload.phone ?? null,
        payload.company_id ?? null,
        payload.user_type,
        payload.user_status ?? 'pending_activation',
        payload.role_id ?? null,
        payload.created_by_user_id ?? null,
      ]
    )
    return result.rows[0] as User
  }

  static async update(id: string, payload: UpdateUserPayload): Promise<User | null> {
    const fields: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (payload.email !== undefined) {
      fields.push(`email = $${paramIndex++}`)
      values.push(payload.email)
    }
    if (payload.password_hash !== undefined) {
      fields.push(`password_hash = $${paramIndex++}`)
      values.push(payload.password_hash)
    }
    if (payload.name !== undefined) {
      fields.push(`name = $${paramIndex++}`)
      values.push(payload.name)
    }
    if (payload.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`)
      values.push(payload.phone)
    }
    if (payload.company_id !== undefined) {
      fields.push(`company_id = $${paramIndex++}`)
      values.push(payload.company_id)
    }
    if (payload.user_status !== undefined) {
      fields.push(`user_status = $${paramIndex++}`)
      values.push(payload.user_status)
    }
    if (payload.profile_photo_url !== undefined) {
      fields.push(`profile_photo_url = $${paramIndex++}`)
      values.push(payload.profile_photo_url)
    }

    if (fields.length === 0) return null

    values.push(id)
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )
    return (result.rows[0] as User) ?? null
  }

  static async updateStatus(id: string, status: UserStatus): Promise<User | null> {
    const result = await pool.query(
      'UPDATE users SET user_status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    )
    return (result.rows[0] as User) ?? null
  }

  static async listStaff(): Promise<StaffAccount[]> {
    const result = await pool.query(
      `SELECT u.id, u.ci, u.email, u.name, u.user_status, u.role_id,
              r.name AS role_name, u.created_at
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name <> 'user'
       ORDER BY r.is_core DESC, r.name ASC, u.name ASC`
    )
    return result.rows as StaffAccount[]
  }

  static async updateStaffAccount(
    id: string,
    payload: { role_id?: string; user_status?: UserStatus; password_hash?: string }
  ): Promise<StaffAccount | null> {
    const fields: string[] = []
    const values: unknown[] = []
    let index = 1

    if (payload.role_id !== undefined) {
      fields.push(`role_id = $${index++}`)
      values.push(payload.role_id)
    }
    if (payload.user_status !== undefined) {
      fields.push(`user_status = $${index++}`)
      values.push(payload.user_status)
    }
    if (payload.password_hash !== undefined) {
      fields.push(`password_hash = $${index++}`)
      values.push(payload.password_hash)
    }
    if (fields.length === 0) return null

    values.push(id)
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${index}
       RETURNING id, ci, email, name, user_status, role_id, created_at`,
      values
    )
    const row = result.rows[0]
    if (!row) return null
    const role = row.role_id ? await RoleQuery.getById(row.role_id) : null
    return { ...row, role_name: role?.name ?? null } as StaffAccount
  }

  static async countActiveAdmins(excludeUserId?: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'admin' AND u.user_status = 'active'
         AND ($1::uuid IS NULL OR u.id <> $1::uuid)`,
      [excludeUserId ?? null]
    )
    return (result.rows[0]?.total as number) ?? 0
  }

  static async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    )
    return (result.rowCount ?? 0) > 0
  }
}
