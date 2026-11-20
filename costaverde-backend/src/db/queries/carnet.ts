import { pool } from '../connection.js'
import type { CarnetData, CarnetWithUser } from '../../types/carnet.js'

export class CarnetQuery {
  static async getById(id: string): Promise<CarnetData | null> {
    const result = await pool.query(
      'SELECT * FROM carnet WHERE id = $1',
      [id]
    )
    return (result.rows[0] as CarnetData) ?? null
  }

  static async getByUserId(userId: string): Promise<CarnetData | null> {
    const result = await pool.query(
      'SELECT * FROM carnet WHERE user_id = $1',
      [userId]
    )
    return (result.rows[0] as CarnetData) ?? null
  }

  static async getWithUser(userId: string): Promise<CarnetWithUser | null> {
    const result = await pool.query(
      `SELECT c.*, u.name as user_name, u.ci as user_ci, u.email as user_email, u.phone as user_phone
       FROM carnet c
       JOIN users u ON c.user_id = u.id
       WHERE c.user_id = $1`,
      [userId]
    )
    return (result.rows[0] as CarnetWithUser) ?? null
  }

  static async create(
    userId: string,
    qrCodeData: string,
    expiresAt: Date
  ): Promise<CarnetData> {
    const result = await pool.query(
      `INSERT INTO carnet (user_id, qr_code_data, issued_at, expires_at, is_valid)
       VALUES ($1, $2, NOW(), $3, true)
       RETURNING *`,
      [userId, qrCodeData, expiresAt]
    )
    return result.rows[0] as CarnetData
  }

  /** Replaces the QR payload (used to rotate legacy unsigned codes). */
  static async setQrData(id: string, qrCodeData: string): Promise<CarnetData | null> {
    const result = await pool.query(
      `UPDATE carnet SET qr_code_data = $2, issued_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, qrCodeData]
    )
    return (result.rows[0] as CarnetData) ?? null
  }

  static async updateValidity(id: string, isValid: boolean): Promise<CarnetData | null> {
    const result = await pool.query(
      'UPDATE carnet SET is_valid = $1 WHERE id = $2 RETURNING *',
      [isValid, id]
    )
    return (result.rows[0] as CarnetData) ?? null
  }

  static async updatePhoto(id: string, photoUrl: string): Promise<CarnetData | null> {
    const result = await pool.query(
      'UPDATE carnet SET photo_url = $1 WHERE id = $2 RETURNING *',
      [photoUrl, id]
    )
    return (result.rows[0] as CarnetData) ?? null
  }

  static async getValidByQR(qrData: string): Promise<CarnetData | null> {
    const result = await pool.query(
      `SELECT * FROM carnet
       WHERE qr_code_data = $1
       AND is_valid = true
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [qrData]
    )
    return (result.rows[0] as CarnetData) ?? null
  }

  /** Valid (non-expired) carnet for a user, used for payload-based lookups. */
  static async getValidByUserId(userId: string): Promise<CarnetData | null> {
    const result = await pool.query(
      `SELECT * FROM carnet
       WHERE user_id = $1
       AND is_valid = true
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    )
    return (result.rows[0] as CarnetData) ?? null
  }
}
