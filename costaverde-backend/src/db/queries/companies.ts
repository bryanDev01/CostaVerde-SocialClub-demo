import { pool } from '../connection.js'

export interface Company {
  id: string
  name: string
  is_active: boolean
  created_at: Date
}

export interface CompanyStatsRow {
  id: string
  name: string
  is_active: boolean
  created_at: Date
  total_users: string
  active_users: string
  suspended_users: string
  pending_payment_users: string
  pending_activation_users: string
  total_associates: string
}

export interface CompanyMemberRow {
  id: string
  ci: string
  name: string
  email: string | null
  phone: string | null
  user_type: string
  user_status: string
  profile_photo_url: string | null
  created_at: Date
  associate_count: string
}

export interface CompanyAssociateRow {
  id: string
  titular_id: string
  titular_name: string
  titular_ci: string
  ci: string
  name: string
  phone: string | null
  relation: string
  date_of_birth: Date | null
}

export class CompanyQuery {
  static async getByName(name: string): Promise<Company | null> {
    const result = await pool.query(
      'SELECT * FROM companies WHERE name = $1',
      [name]
    )
    return (result.rows[0] as Company) ?? null
  }

  static async getById(id: string): Promise<Company | null> {
    const result = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [id]
    )
    return (result.rows[0] as Company) ?? null
  }

  static async upsertByName(name: string): Promise<Company> {
    const result = await pool.query(
      `INSERT INTO companies (name, is_active)
       VALUES ($1, true)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [name]
    )
    return result.rows[0] as Company
  }

  static async create(name: string, isActive = true): Promise<Company> {
    const result = await pool.query(
      `INSERT INTO companies (name, is_active)
       VALUES ($1, $2)
       RETURNING *`,
      [name, isActive]
    )
    return result.rows[0] as Company
  }

  static async update(
    id: string,
    payload: { name?: string; isActive?: boolean }
  ): Promise<Company | null> {
    const fields: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (payload.name !== undefined) {
      fields.push(`name = $${paramIndex++}`)
      values.push(payload.name)
    }
    if (payload.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`)
      values.push(payload.isActive)
    }
    if (fields.length === 0) return null

    values.push(id)
    const result = await pool.query(
      `UPDATE companies SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )
    return (result.rows[0] as Company) ?? null
  }

  /** The HR account currently linked to a company (if any). */
  static async getAssignedHrUserId(companyId: string): Promise<string | null> {
    const result = await pool.query<{ id: string }>(
      `SELECT u.id
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.name = 'hr' AND u.company_id = $1
       LIMIT 1`,
      [companyId]
    )
    return result.rows[0]?.id ?? null
  }

  /** Active companies that do not yet have an HR account assigned. */
  static async listAvailableForHr(): Promise<Company[]> {
    const result = await pool.query<Company>(
      `SELECT c.*
       FROM companies c
       WHERE c.is_active = true
       AND NOT EXISTS (
         SELECT 1 FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE r.name = 'hr' AND u.company_id = c.id
       )
       ORDER BY c.name ASC`
    )
    return result.rows
  }

  /** All companies with per-status user counts and associate totals. */
  static async listWithStats(): Promise<CompanyStatsRow[]> {
    const result = await pool.query<CompanyStatsRow>(
      `SELECT
         c.id,
         c.name,
         c.is_active,
         c.created_at,
         COUNT(u.id) FILTER (WHERE ur.id IS NOT NULL) AS total_users,
         COUNT(u.id) FILTER (WHERE ur.id IS NOT NULL AND u.user_status = 'active') AS active_users,
         COUNT(u.id) FILTER (WHERE ur.id IS NOT NULL AND u.user_status = 'suspended') AS suspended_users,
         COUNT(u.id) FILTER (WHERE ur.id IS NOT NULL AND u.user_status = 'pending_payment') AS pending_payment_users,
         COUNT(u.id) FILTER (WHERE ur.id IS NOT NULL AND u.user_status = 'pending_activation') AS pending_activation_users,
         COALESCE(
           (
             SELECT COUNT(a.id)
             FROM associates a
             JOIN users au ON au.id = a.user_id
             JOIN roles aur ON aur.id = au.role_id AND aur.name = 'user'
             WHERE au.company_id = c.id
           ), 0
         ) AS total_associates
       FROM companies c
       LEFT JOIN users u ON u.company_id = c.id
       LEFT JOIN roles ur ON ur.id = u.role_id AND ur.name = 'user'
       GROUP BY c.id, c.name, c.is_active, c.created_at
       ORDER BY c.name ASC`
    )
    return result.rows
  }

  /** Titular members of a company with their associate counts. */
  static async getMembersByCompany(companyId: string): Promise<CompanyMemberRow[]> {
    const result = await pool.query<CompanyMemberRow>(
      `SELECT
         u.id,
         u.ci,
         u.name,
         u.email,
         u.phone,
         u.user_type,
         u.user_status,
         u.profile_photo_url,
         u.created_at,
         (SELECT COUNT(*) FROM associates a WHERE a.user_id = u.id) AS associate_count
       FROM users u
      JOIN roles r ON r.id = u.role_id AND r.name = 'user'
      WHERE u.company_id = $1
       ORDER BY u.name ASC`,
      [companyId]
    )
    return result.rows
  }

  /** All family associates of a company (inherited from titulares). */
  static async getAssociatesByCompany(companyId: string): Promise<CompanyAssociateRow[]> {
    const result = await pool.query<CompanyAssociateRow>(
      `SELECT
         a.id,
         a.user_id AS titular_id,
         u.name AS titular_name,
         u.ci AS titular_ci,
         a.ci,
         a.name,
         a.phone,
         a.relation,
         a.date_of_birth
       FROM associates a
       JOIN users u ON u.id = a.user_id
      JOIN roles r ON r.id = u.role_id AND r.name = 'user'
       WHERE u.company_id = $1
       ORDER BY u.name ASC, a.name ASC`,
      [companyId]
    )
    return result.rows
  }
}
