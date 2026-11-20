import { env } from './env.js'

const MIN_SECRET_LENGTH = 32
const KNOWN_DEFAULT_SECRETS = [
  'your-super-secret-key-change-in-production',
]

function validateJwtSecret(secret: string): string {
  if (KNOWN_DEFAULT_SECRETS.includes(secret)) {
    throw new Error(
      'JWT_SECRET is a known default value and must be replaced with a cryptographically random secret'
    )
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters in production`
      )
    }
    console.warn(
      `WARNING: JWT_SECRET is shorter than ${MIN_SECRET_LENGTH} characters. Acceptable for development only.`
    )
  }
  return secret
}

export interface AuthConfig {
  jwtSecret: string
  jwtExpiresIn: string
  bcryptSaltRounds: number
}

export const authConfig: AuthConfig = {
  jwtSecret: validateJwtSecret(env.JWT_SECRET),
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  bcryptSaltRounds: 10,
}

export function getJwtSecret(): string {
  return authConfig.jwtSecret
}

export function getJwtExpiresIn(): string {
  return authConfig.jwtExpiresIn
}
