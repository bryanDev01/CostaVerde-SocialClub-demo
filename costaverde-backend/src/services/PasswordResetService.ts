import { createHash, randomBytes } from 'node:crypto'
import { PasswordResetQuery } from '../db/queries/passwordResets.js'
import { UserQuery } from '../db/queries/users.js'
import { hashPassword } from '../utils/password.js'
import { sendPasswordResetEmail } from '../utils/mailer.js'
import { env } from '../config/env.js'
import { ValidationError } from '../utils/errors.js'

const TOKEN_TTL_MINUTES = 30
const MIN_PASSWORD_LENGTH = 8

export interface RequestResetResult {
  sent: boolean
  /**
   * Present only outside production and only when no email transport is
   * configured, so the flow can be exercised locally. Never set in production.
   */
  dev_reset_url: string | null
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export class PasswordResetService {
  /**
   * Always resolves successfully (even for unknown emails) to avoid leaking
   * which addresses are registered.
   */
  static async requestReset(email: string | undefined): Promise<RequestResetResult> {
    const generic: RequestResetResult = { sent: true, dev_reset_url: null }
    const normalized = email?.trim()
    if (!normalized) return generic

    const user = await UserQuery.getByEmail(normalized)
    if (!user || !user.email) return generic
    if (user.user_status === 'inactive' || user.user_status === 'pending_activation') {
      return generic
    }

    await PasswordResetQuery.invalidateForUser(user.id)

    const rawToken = randomBytes(32).toString('hex')
    await PasswordResetQuery.create(user.id, hashToken(rawToken), TOKEN_TTL_MINUTES)

    const baseUrl = env.CORS_ORIGIN.replace(/\/$/, '')
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`
    const delivered = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    })

    return {
      sent: true,
      dev_reset_url:
        !delivered && env.PASSWORD_RESET_DEV_URL ? resetUrl : null,
    }
  }

  static async validateToken(token: string | undefined): Promise<boolean> {
    if (!token) return false
    const record = await PasswordResetQuery.getValidByHash(hashToken(token))
    return record !== null
  }

  static async resetPassword(
    token: string | undefined,
    newPassword: string | undefined
  ): Promise<void> {
    if (!token) throw new ValidationError('token is required')
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError('Password must be at least 8 characters')
    }

    const record = await PasswordResetQuery.getValidByHash(hashToken(token))
    if (!record) {
      throw new ValidationError('Invalid or expired reset token')
    }

    const passwordHash = await hashPassword(newPassword)
    await UserQuery.update(record.user_id, { password_hash: passwordHash })
    await PasswordResetQuery.invalidateForUser(record.user_id)
  }
}
