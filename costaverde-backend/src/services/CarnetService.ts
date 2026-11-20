import { CarnetQuery } from '../db/queries/carnet.js'
import { UserQuery } from '../db/queries/users.js'
import { SubscriptionQuery } from '../db/queries/subscriptions.js'
import { AssociateQuery } from '../db/queries/associates.js'
import { NotFoundError } from '../utils/errors.js'
import { membershipNumber } from '../utils/helpers.js'
import { signCarnetToken, verifyCarnetToken } from '../utils/carnetToken.js'
import type { CarnetData } from '../types/carnet.js'
import type { Associate, UserProfile, UserStatus } from '../types/index.js'

const ACTIVE_STATUSES: ReadonlySet<UserStatus> = new Set(['active', 'external_active'])

export interface CarnetVerificationResult {
  valid: boolean
  reason?: string
  /** Sanitized public profile (no password hash or internal ids leakage). */
  member?: UserProfile
  member_code?: string
  associates?: Associate[]
}

export class CarnetService {
  /**
   * Get or create carnet for a user.
   * Auto-creates on first call if carnet doesn't exist.
   */
  static async getOrCreate(userId: string): Promise<CarnetData> {
    let carnet = await CarnetQuery.getByUserId(userId)
    if (carnet) {
      // Legacy carnets stored an unsigned JSON payload that anyone could forge.
      // Rotate them to a signed token; the old code stops working.
      if (verifyCarnetToken(carnet.qr_code_data ?? '') === null) {
        const rotated = await CarnetQuery.setQrData(carnet.id, signCarnetToken(userId))
        if (rotated) carnet = rotated
      }
      return carnet
    }

    const user = await UserQuery.getById(userId)
    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Get active subscription to determine expires_at
    const subscription = await SubscriptionQuery.getActiveByUserId(userId)
    const expiresAt = subscription?.expires_at ??
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Fallback: 1 year

    carnet = await CarnetQuery.create(userId, signCarnetToken(userId), expiresAt)
    return carnet
  }

  /**
   * Verify a scanned QR code.
   * Resolves the carnet from the payload's user_id first (robust to JSON
   * reformatting), falling back to an exact stored-payload match.
   */
  static async verifyQR(qrPayload: string): Promise<CarnetVerificationResult> {
    // Signature first: a forged or altered payload never reaches the database.
    const payload = verifyCarnetToken(qrPayload)
    if (!payload) {
      return { valid: false, reason: 'Código QR inválido o alterado' }
    }

    // The stored carnet must match exactly: rotating the QR revokes old copies.
    const carnet = await CarnetQuery.getValidByUserId(payload.uid)
    if (!carnet || carnet.qr_code_data !== qrPayload) {
      return { valid: false, reason: 'Carnet no vigente o reemplazado' }
    }

    // Verify user is active (safe profile projection, no secrets)
    const member = await UserQuery.getProfileById(carnet.user_id)
    if (!member || !ACTIVE_STATUSES.has(member.user_status)) {
      return { valid: false, reason: 'User is not active' }
    }

    // For corporate users, verify active subscription
    if (member.user_type === 'corporate') {
      const subscription = await SubscriptionQuery.getActiveByUserId(member.id)
      if (!subscription) {
        return { valid: false, reason: 'No active subscription' }
      }
    }

    // Get associates
    const associates = await AssociateQuery.getByUserId(member.id)

    return {
      valid: true,
      member,
      member_code: membershipNumber(member.id),
      associates,
    }
  }

  /**
   * Get carnet by user ID (returns null if not exists).
   */
  static async getByUserId(userId: string): Promise<CarnetData | null> {
    return await CarnetQuery.getByUserId(userId)
  }

  /**
   * Invalidate all expired carnets (for scheduled job).
   */
  static async invalidateExpired(): Promise<number> {
    // This would need a query to find expired carnets and invalidate them
    // For MVP, we rely on getValidByQR checking expires_at
    return 0
  }
}
