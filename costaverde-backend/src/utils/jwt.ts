import jwt, { type SignOptions } from 'jsonwebtoken'
import { getJwtSecret, getJwtExpiresIn } from '../config/auth.js'
import type { JwtPayload } from '../types/user.js'
import { AuthError } from './errors.js'

const JWT_ALGORITHM = 'HS256' as const

interface JwtTokenPayload {
  userId: string
  email: string | null
  role: string
  userType: string
  companyId: string | null
}

export function signToken(payload: JwtPayload): string {
  const tokenPayload: JwtTokenPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    userType: payload.userType,
    companyId: payload.companyId,
  }

  const options: SignOptions = {
    algorithm: JWT_ALGORITHM,
    expiresIn: getJwtExpiresIn() as SignOptions['expiresIn'],
  }

  return jwt.sign(tokenPayload, getJwtSecret(), options)
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: [JWT_ALGORITHM],
    }) as JwtTokenPayload

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as JwtPayload['role'],
      userType: decoded.userType as JwtPayload['userType'],
      companyId: decoded.companyId ?? null,
    }
  } catch {
    throw new AuthError('Invalid or expired token')
  }
}
