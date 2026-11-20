import { pool } from '../connection.js'
import { generateReferenceCode } from '../../utils/helpers.js'
import type { Payment, CreatePaymentPayload, PaymentWithUser } from '../../types/payment.js'
import type { PoolClient } from 'pg'

export class PaymentQuery {
  static async getById(id: string): Promise<Payment | null> {
    const result = await pool.query(
      'SELECT * FROM payments WHERE id = $1',
      [id]
    )
    return (result.rows[0] as Payment) ?? null
  }

  static async getByIdForUpdate(client: PoolClient, id: string): Promise<Payment | null> {
    const result = await client.query(
      'SELECT * FROM payments WHERE id = $1 FOR UPDATE',
      [id]
    )
    return (result.rows[0] as Payment) ?? null
  }

  static async getByReferenceCode(referenceCode: string): Promise<Payment | null> {
    const result = await pool.query(
      'SELECT * FROM payments WHERE reference_code = $1',
      [referenceCode]
    )
    return (result.rows[0] as Payment) ?? null
  }

  static async getByUserId(userId: string): Promise<Payment[]> {
    const result = await pool.query(
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )
    return result.rows as Payment[]
  }

  static async getPending(): Promise<PaymentWithUser[]> {
    const result = await pool.query(
      `SELECT p.*, u.name as user_name, u.ci as user_ci, u.email as user_email
       FROM payments p
       JOIN users u ON p.user_id = u.id
       WHERE p.status = 'pending_validation'
       ORDER BY p.created_at ASC`
    )
    return result.rows as PaymentWithUser[]
  }

  static async getWithUser(id: string): Promise<PaymentWithUser | null> {
    const result = await pool.query(
      `SELECT p.*, u.name as user_name, u.ci as user_ci, u.email as user_email
       FROM payments p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id]
    )
    return (result.rows[0] as PaymentWithUser) ?? null
  }

  static async create(payload: CreatePaymentPayload): Promise<Payment> {
    const result = await pool.query(
      `INSERT INTO payments (user_id, subscription_id, amount_cup, reference_code, transaction_number, payment_type, reservation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        payload.user_id,
        payload.subscription_id ?? null,
        payload.amount_cup,
        payload.reference_code,
        payload.transaction_number ?? null,
        payload.payment_type,
        payload.reservation_id ?? null,
      ]
    )
    return result.rows[0] as Payment
  }

  static async validate(id: string): Promise<Payment | null> {
    const result = await pool.query(
      `UPDATE payments
       SET status = 'validated', validated_at = NOW()
       WHERE id = $1 AND status = 'pending_validation'
       RETURNING *`,
      [id]
    )
    return (result.rows[0] as Payment) ?? null
  }

  static async validateInTx(client: PoolClient, id: string): Promise<Payment | null> {
    const result = await client.query(
      `UPDATE payments
       SET status = 'validated', validated_at = NOW()
       WHERE id = $1 AND status = 'pending_validation'
       RETURNING *`,
      [id]
    )
    return (result.rows[0] as Payment) ?? null
  }

  static async reject(id: string): Promise<Payment | null> {
    const result = await pool.query(
      `UPDATE payments
       SET status = 'rejected'
       WHERE id = $1 AND status = 'pending_validation'
       RETURNING *`,
      [id]
    )
    return (result.rows[0] as Payment) ?? null
  }

  static async rejectInTx(client: PoolClient, id: string): Promise<Payment | null> {
    const result = await client.query(
      `UPDATE payments
       SET status = 'rejected'
       WHERE id = $1 AND status = 'pending_validation'
       RETURNING *`,
      [id]
    )
    return (result.rows[0] as Payment) ?? null
  }

  static async advisoryLockUser(client: PoolClient, userId: string): Promise<void> {
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1)::bigint)',
      [`payment_ref:${userId}`]
    )
  }

  private static async generateReferenceCodeInTx(
    client: PoolClient,
    userId: string
  ): Promise<string> {
    const seqResult = await client.query(
      `SELECT COUNT(*) as count
       FROM payments
       WHERE user_id = $1
       AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`,
      [userId]
    )
    const sequence = parseInt(seqResult.rows[0].count as string, 10) + 1
    return generateReferenceCode(userId, sequence)
  }

  static async createInTx(
    client: PoolClient,
    payload: Omit<CreatePaymentPayload, 'reference_code'>
  ): Promise<Payment> {
    const referenceCode = await PaymentQuery.generateReferenceCodeInTx(client, payload.user_id)
    const result = await client.query(
      `INSERT INTO payments (user_id, subscription_id, amount_cup, reference_code, transaction_number, payment_type, reservation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        payload.user_id,
        payload.subscription_id ?? null,
        payload.amount_cup,
        referenceCode,
        payload.transaction_number ?? null,
        payload.payment_type,
        payload.reservation_id ?? null,
      ]
    )
    return result.rows[0] as Payment
  }

  static async createWithAdvisoryLock(
    payload: Omit<CreatePaymentPayload, 'reference_code'>
  ): Promise<Payment> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')
      await PaymentQuery.advisoryLockUser(client, payload.user_id)
      const payment = await PaymentQuery.createInTx(client, payload)
      await client.query('COMMIT')
      return payment
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  static async getValidPerVisitByUserId(userId: string): Promise<Payment | null> {
    const result = await pool.query(
      `SELECT * FROM payments
       WHERE user_id = $1
       AND payment_type = 'per_visit'
       AND status = 'validated'
       ORDER BY validated_at DESC
       LIMIT 1`,
      [userId]
    )
    return (result.rows[0] as Payment) ?? null
  }

  static async updateTransactionNumber(
    id: string,
    transactionNumber: string
  ): Promise<Payment | null> {
    const result = await pool.query(
      `UPDATE payments
       SET transaction_number = $1
       WHERE id = $2
       RETURNING *`,
      [transactionNumber, id]
    )
    return (result.rows[0] as Payment) ?? null
  }
}
