import type { Request, Response, NextFunction } from 'express'
import {
  ValidationError,
  PaymentError,
  AuthError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString()

  if (err instanceof ValidationError) {
    res.status(400).json({ success: false, error: err.message, timestamp })
    return
  }
  if (err instanceof AuthError) {
    res.status(401).json({ success: false, error: err.message, timestamp })
    return
  }
  if (err instanceof ForbiddenError) {
    res.status(403).json({ success: false, error: err.message, timestamp })
    return
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ success: false, error: err.message, timestamp })
    return
  }
  if (err instanceof PaymentError) {
    res.status(402).json({ success: false, error: err.message, timestamp })
    return
  }
  if (err instanceof ConflictError) {
    res.status(409).json({ success: false, error: err.message, timestamp })
    return
  }

  // Map PostgreSQL error codes to meaningful HTTP responses instead of 500.
  // err.detail may contain PII (CI, email) — never expose it to the client.
  const pgError = err as { code?: string; constraint?: string; detail?: string }
  if (pgError.code === '23505') {
    console.error('PG unique violation:', pgError.constraint)
    res.status(409).json({
      success: false,
      error: 'Duplicate record: the value already exists',
      timestamp,
    })
    return
  }
  if (pgError.code === '23503') {
    console.error('PG foreign key violation:', pgError.constraint)
    res.status(409).json({
      success: false,
      error: 'Referenced record does not exist or is still in use',
      timestamp,
    })
    return
  }
  if (pgError.code === '22P02' || pgError.code === '23502' || pgError.code === '23514') {
    console.error('PG data integrity error:', pgError.code, pgError.constraint)
    res.status(400).json({
      success: false,
      error: 'Invalid data: a field has an invalid value or format',
      timestamp,
    })
    return
  }

  console.error('Unhandled error:', err instanceof Error ? `${err.name}: ${err.message}` : err)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp,
  })
}

export function notFoundHandler(
  _req: Request,
  res: Response
): void {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    timestamp: new Date().toISOString(),
  })
}
