import type { NextFunction, Request, Response } from 'express'

interface LockoutRecord {
  failures: number
  windowStart: number
  blockedUntil: number | null
}

const MAX_FAILED_ATTEMPTS = 5
const WINDOW_MS = 10 * 60 * 1000
const LOCKOUT_MS = 10 * 60 * 1000

const records = new Map<string, LockoutRecord>()

function getKey(req: Request): string {
  const body = req.body as { email?: unknown }
  const email =
    typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const ip = req.ip ?? 'unknown'
  return `${ip}:${email}`
}

function getRecord(key: string, now: number): LockoutRecord {
  const existing = records.get(key)
  if (!existing) {
    const record: LockoutRecord = { failures: 0, windowStart: now, blockedUntil: null }
    records.set(key, record)
    return record
  }
  if (existing.blockedUntil !== null && existing.blockedUntil <= now) {
    existing.blockedUntil = null
    existing.failures = 0
    existing.windowStart = now
  } else if (existing.windowStart + WINDOW_MS <= now) {
    existing.blockedUntil = null
    existing.failures = 0
    existing.windowStart = now
  }
  return existing
}

export function loginLockout(req: Request, res: Response, next: NextFunction): void {
  const record = getRecord(getKey(req), Date.now())
  if (record.blockedUntil !== null) {
    res.status(429).json({
      success: false,
      error: 'Too many failed login attempts. Please try again later.',
      timestamp: new Date().toISOString(),
    })
    return
  }
  next()
}

export function recordLoginFailure(req: Request): void {
  const record = getRecord(getKey(req), Date.now())
  record.failures += 1
  if (record.failures >= MAX_FAILED_ATTEMPTS) {
    record.blockedUntil = Date.now() + LOCKOUT_MS
    record.failures = 0
  }
}

export function recordLoginSuccess(req: Request): void {
  records.delete(getKey(req))
}