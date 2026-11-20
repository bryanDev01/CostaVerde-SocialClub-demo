import { pool } from '../connection.js'

export interface PasswordResetToken {
  id: string
  user_id: string
  token_hash: string
  expires_at: Date
  used_at: Date | null
  created_at: Date
}

export class PasswordResetQuery {
  static async create(
    userId: string,
    tokenHash: string,
    ttlMinutes: number
  ): Promise<PasswordResetToken> {
    const result = await pool.query<PasswordResetToken>(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'))
       RETURNING *`,
      [userId, tokenHash, ttlMinutes]
    )
    return result.rows[0]
  }

  /** Look up an unused, non-expired token by its stored hash. */
  static async getValidByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const result = await pool.query<PasswordResetToken>(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    )
    return result.rows[0] ?? null
  }

  static async markUsed(id: string): Promise<void> {
    await pool.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
      [id]
    )
  }

  /** Remove any outstanding tokens for a user (on new request or successful reset). */
  static async invalidateForUser(userId: string): Promise<number> {
    const result = await pool.query(
      `DELETE FROM password_reset_tokens WHERE user_id = $1`,
      [userId]
    )
    return result.rowCount ?? 0
  }
}
