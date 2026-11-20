import { createHmac, timingSafeEqual } from 'crypto'
import { env } from '../config/env.js'

/**
 * Signed carnet QR tokens.
 *
 * Format: `v1.<base64url(json payload)>.<base64url(HMAC-SHA256)>`
 * The key is derived from JWT_SECRET with a fixed label, so no extra secret
 * has to be provisioned. The payload carries only the user id and issue time;
 * all identity data is read from the database when the QR is scanned.
 */

const VERSION = 'v1'
const KEY = createHmac('sha256', env.JWT_SECRET).update('carnet-qr-signing-v1').digest()

export interface CarnetTokenPayload {
  uid: string
  iat: number
}

function sign(body: string): Buffer {
  return createHmac('sha256', KEY).update(`${VERSION}.${body}`).digest()
}

export function signCarnetToken(userId: string): string {
  const payload: CarnetTokenPayload = { uid: userId, iat: Date.now() }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${VERSION}.${body}.${sign(body).toString('base64url')}`
}

/** Returns the payload only when the signature is valid. */
export function verifyCarnetToken(token: string): CarnetTokenPayload | null {
  if (typeof token !== 'string' || token.length > 512) return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== VERSION) return null

  const body = parts[1]
  const received = Buffer.from(parts[2], 'base64url')
  const expected = sign(body)
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as CarnetTokenPayload).uid === 'string' &&
      typeof (parsed as CarnetTokenPayload).iat === 'number'
    ) {
      return parsed as CarnetTokenPayload
    }
    return null
  } catch {
    return null
  }
}
