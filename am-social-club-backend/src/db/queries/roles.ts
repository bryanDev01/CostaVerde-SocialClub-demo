import { pool } from '../connection.js'

export interface Role {
  id: string
  name: string
  permissions: string[]
  is_core: boolean
  description: string | null
  created_at: Date
}

export interface RoleWithUsage extends Role {
  user_count: number
}

export class RoleQuery {
  static async getByName(name: string): Promise<Role | null> {
    const result = await pool.query(
      'SELECT * FROM roles WHERE name = $1',
      [name]
    )
    return (result.rows[0] as Role) ?? null
  }

  static async getById(id: string): Promise<Role | null> {
    const result = await pool.query(
      'SELECT * FROM roles WHERE id = $1',
      [id]
    )
    return (result.rows[0] as Role) ?? null
  }

  static async listAll(): Promise<RoleWithUsage[]> {
    const result = await pool.query(
      `SELECT r.id, r.name, r.permissions, r.is_core, r.description, r.created_at,
              COUNT(u.id)::int AS user_count
       FROM roles r
       LEFT JOIN users u ON u.role_id = r.id
       GROUP BY r.id
       ORDER BY r.is_core DESC, r.name ASC`
    )
    return result.rows as RoleWithUsage[]
  }

  static async create(payload: {
    name: string
    description: string | null
    permissions: string[]
  }): Promise<Role> {
    const result = await pool.query(
      `INSERT INTO roles (name, permissions, description, is_core)
       VALUES ($1, $2::text[], $3, false)
       RETURNING *`,
      [payload.name, payload.permissions, payload.description]
    )
    return result.rows[0] as Role
  }

  static async update(
    id: string,
    payload: { description: string | null; permissions: string[] }
  ): Promise<Role | null> {
    const result = await pool.query(
      `UPDATE roles
       SET description = $2, permissions = $3::text[]
       WHERE id = $1
       RETURNING *`,
      [id, payload.description, payload.permissions]
    )
    return (result.rows[0] as Role) ?? null
  }

  static async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM roles WHERE id = $1', [id])
    return (result.rowCount ?? 0) > 0
  }

  static async countUsers(id: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*)::int AS total FROM users WHERE role_id = $1',
      [id]
    )
    return (result.rows[0]?.total as number) ?? 0
  }
}
