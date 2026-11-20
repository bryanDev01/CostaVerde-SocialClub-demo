import { randomBytes } from 'node:crypto'
import { env } from '../config/env.js'
import { ValidationError } from './errors.js'

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

const CLUB_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: env.CLUB_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Calendar date (YYYY-MM-DD) of an instant in the club's timezone. */
export function clubDateOnly(date: Date = new Date()): string {
  const parts = CLUB_DATE_FORMATTER.formatToParts(date)
  const pick = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${pick('year')}-${pick('month')}-${pick('day')}`
}

/** Today in the club's timezone, as YYYY-MM-DD. */
export function clubToday(): string {
  return clubDateOnly(new Date())
}

/** Offset (minutes) of the club timezone at the given instant. */
function clubOffsetMinutes(instant: Date): number {
  const name =
    new Intl.DateTimeFormat('en-US', {
      timeZone: env.CLUB_TIMEZONE,
      timeZoneName: 'longOffset',
    })
      .formatToParts(instant)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(name)
  if (!match) return 0
  const sign = match[1] === '-' ? -1 : 1
  return sign * (Number(match[2]) * 60 + Number(match[3]))
}

/**
 * UTC instant of a wall-clock time (default 00:00) on a club-local date.
 * DST-safe: the offset is resolved at the target instant, not at "now".
 */
export function clubDateToUtc(dateStr: string, hour = 0): Date {
  const [year, month, day] = parseDate(dateStr)
    .toISOString()
    .slice(0, 10)
    .split('-')
    .map(Number)
  let utc = Date.UTC(year, month - 1, day, hour)
  for (let attempt = 0; attempt < 2; attempt++) {
    utc = Date.UTC(year, month - 1, day, hour) - clubOffsetMinutes(new Date(utc)) * 60_000
  }
  return new Date(utc)
}

/**
 * Format a Date to YYYY-MM-DD using local time (no UTC shift).
 * Safe for pg DATE columns that node-pg returns as local-midnight Dates.
 */
export function toDateOnly(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(value).slice(0, 10)
}

export function startOfWeek(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfWeek(date: Date = new Date()): Date {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 7)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false
  return expiresAt.getTime() < Date.now()
}

export function isInGracePeriod(
  expiresAt: Date | null,
  gracePeriodDays: number = env.GRACE_PERIOD_DAYS
): boolean {
  if (!expiresAt) return false
  const graceEnd = addDays(expiresAt, gracePeriodDays)
  return expiresAt.getTime() <= Date.now() && Date.now() < graceEnd.getTime()
}

export function isPastGracePeriod(
  expiresAt: Date | null,
  gracePeriodDays: number = env.GRACE_PERIOD_DAYS
): boolean {
  if (!expiresAt) return false
  const graceEnd = addDays(expiresAt, gracePeriodDays)
  return Date.now() >= graceEnd.getTime()
}

export function generateReferenceCode(userId: string, sequence: number): string {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const seq = String(sequence).padStart(3, '0')
  const shortUserId = userId.replace(/-/g, '').slice(0, 8)
  return `AMSC-${shortUserId}-${yearMonth}-${seq}`
}

export function generateTransactionNumber(): string {
  const now = Date.now().toString(36)
  const random = randomBytes(8).toString('hex')
  return `TXN-${now}-${random}`.toUpperCase()
}

export function maskCI(ci: string): string {
  if (!ci || ci.length < 8) return '***'
  return `${ci.slice(0, 4)}****${ci.slice(-3)}`
}

/**
 * Human-friendly membership number derived from the user UUID.
 * Example: AMSC-4F2A-91C0. Stable, short, scannable by reception.
 */
export function membershipNumber(userId: string): string {
  const hex = userId.replace(/-/g, '').toUpperCase().slice(0, 8)
  return `AMSC-${hex.slice(0, 4)}-${hex.slice(4, 8)}`
}

export function parseDate(dateStr: string): Date {
  const parts = dateStr.split('-')
  if (parts.length !== 3) {
    throw new ValidationError(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`)
  }
  const [year, month, day] = parts.map(Number)
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new ValidationError(`Invalid date: ${dateStr}`)
  }
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new ValidationError(`Invalid date: ${dateStr} (day ${day} does not exist in month ${month})`)
  }
  return date
}
