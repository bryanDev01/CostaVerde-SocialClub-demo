import { pool } from '../connection.js'
import type { PreEmployee, PreEmployeeStatus, EmployeeUploadRow, EmployeeUploadResult } from '../../types/employee.js'

function sanitizeError(error: unknown, ci: string): string {
  if (error instanceof Error) {
    const pgError = error as Error & { code?: string }
    if (pgError.code === '23505') return `Duplicate record: CI ${ci} already exists in the system`
    if (pgError.code === '22P02') return `Invalid data format for CI ${ci}`
    if (pgError.code === '23502') return `Missing required field for CI ${ci}`
  }
  return `Row rejected: invalid data for CI ${ci}`
}

export class EmployeeQuery {
  static async getByCI(ci: string): Promise<PreEmployee | null> {
    const result = await pool.query(
      'SELECT * FROM pre_employees WHERE ci = $1',
      [ci]
    )
    return (result.rows[0] as PreEmployee) ?? null
  }

  static async getAll(): Promise<PreEmployee[]> {
    const result = await pool.query(
      'SELECT * FROM pre_employees ORDER BY imported_at DESC'
    )
    return result.rows as PreEmployee[]
  }

  static async getByCompany(company: string): Promise<PreEmployee[]> {
    const result = await pool.query(
      'SELECT * FROM pre_employees WHERE company = $1 ORDER BY imported_at DESC',
      [company]
    )
    return result.rows as PreEmployee[]
  }

  static async getByStatus(status: PreEmployeeStatus, company?: string): Promise<PreEmployee[]> {
    if (company) {
      const result = await pool.query(
        `SELECT * FROM pre_employees
         WHERE status = $1 AND company = $2
         ORDER BY imported_at DESC`,
        [status, company]
      )
      return result.rows as PreEmployee[]
    }
    const result = await pool.query(
      'SELECT * FROM pre_employees WHERE status = $1 ORDER BY imported_at DESC',
      [status]
    )
    return result.rows as PreEmployee[]
  }

  static async listByStatus(
    status: PreEmployeeStatus | undefined,
    company?: string
  ): Promise<PreEmployee[]> {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (status) {
      conditions.push(`status = $${paramIndex++}`)
      values.push(status)
    }
    if (company) {
      conditions.push(`company = $${paramIndex++}`)
      values.push(company)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const result = await pool.query(
      `SELECT * FROM pre_employees ${whereClause} ORDER BY imported_at DESC`,
      values
    )
    return result.rows as PreEmployee[]
  }

  static async bulkInsert(
    rows: EmployeeUploadRow[],
    _importedByUserId: string
  ): Promise<EmployeeUploadResult> {
    const result: EmployeeUploadResult = {
      total: rows.length,
      imported: 0,
      skipped: 0,
      errors: [],
    }

    if (rows.length === 0) {
      return result
    }

    // Batch insert in chunks. ON CONFLICT (ci) DO NOTHING skips duplicates in
    // a single round trip; RETURNING lets us count how many were inserted.
    const CHUNK_SIZE = 500
    for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
      const chunk = rows.slice(start, start + CHUNK_SIZE)
      const values: unknown[] = []
      const placeholders = chunk.map((row, i) => {
        const base = i * 5
        values.push(row.ci, row.name, row.company, row.email ?? null, row.phone ?? null)
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, 'pending')`
      })

      try {
        const inserted = await pool.query(
          `INSERT INTO pre_employees (ci, name, company, email, phone, status)
           VALUES ${placeholders.join(', ')}
           ON CONFLICT (ci) DO NOTHING
           RETURNING ci`,
          values
        )
        result.imported += inserted.rows.length
        result.skipped += chunk.length - inserted.rows.length
      } catch {
        // Fall back to per-row processing so one bad row doesn't reject the chunk.
        for (let i = 0; i < chunk.length; i++) {
          const row = chunk[i]
          try {
            await pool.query(
              `INSERT INTO pre_employees (ci, name, company, email, phone, status)
               VALUES ($1, $2, $3, $4, $5, 'pending')`,
              [row.ci, row.name, row.company, row.email ?? null, row.phone ?? null]
            )
            result.imported++
          } catch (rowError) {
            result.errors.push({
              row: start + i + 1,
              ci: row.ci,
              reason: sanitizeError(rowError, row.ci),
            })
          }
        }
      }
    }

    return result
  }

  static async activate(
    ci: string,
    userId: string,
    activatedByUserId: string
  ): Promise<PreEmployee | null> {
    const result = await pool.query(
      `UPDATE pre_employees
       SET status = 'activated', user_id = $1, activated_by_user_id = $2, activated_at = NOW()
       WHERE ci = $3 AND status = 'pending'
       RETURNING *`,
      [userId, activatedByUserId, ci]
    )
    return (result.rows[0] as PreEmployee) ?? null
  }

  static async reject(ci: string): Promise<PreEmployee | null> {
    const result = await pool.query(
      `UPDATE pre_employees
       SET status = 'rejected'
       WHERE ci = $1 AND status = 'pending'
       RETURNING *`,
      [ci]
    )
    return (result.rows[0] as PreEmployee) ?? null
  }
}
