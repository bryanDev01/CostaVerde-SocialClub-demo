import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { GRACE_PERIOD_DAYS } from './constants'

type DateInput = string | Date

function toDate(value: DateInput): Date {
  return typeof value === 'string' ? parseISO(value) : value
}

export function formatDate(value: DateInput, pattern = "d 'de' MMMM 'de' yyyy"): string {
  return format(toDate(value), pattern, { locale: es })
}

export function formatShortDate(value: DateInput): string {
  return format(toDate(value), "EEE d 'de' MMM", { locale: es })
}

export function formatDateTime(value: DateInput): string {
  return format(toDate(value), "d 'de' MMM, h:mm a", { locale: es })
}

export function formatDateRange(start: DateInput, end: DateInput): string {
  const startDate = toDate(start)
  const endDate = toDate(end)
  if (isSameDay(startDate, endDate)) return formatDate(startDate)
  return `${formatDate(startDate, "d MMM")} — ${formatDate(endDate)}`
}

export function daysUntil(value: DateInput): number {
  return differenceInCalendarDays(toDate(value), new Date())
}

export function isPastDate(value: DateInput): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return isBefore(toDate(value), today)
}

export function isWithinGracePeriod(expiresAt: DateInput): boolean {
  const graceEnd = addDays(toDate(expiresAt), GRACE_PERIOD_DAYS)
  return isAfter(graceEnd, new Date())
}

export function getWeekBounds(reference: Date = new Date()): { start: Date; end: Date } {
  return {
    start: startOfWeek(reference, { weekStartsOn: 1 }),
    end: endOfWeek(reference, { weekStartsOn: 1 }),
  }
}

export function isWithinCurrentWeek(value: DateInput): boolean {
  const { start, end } = getWeekBounds()
  return isWithinInterval(toDate(value), { start, end })
}

export function toDateInputValue(value: Date = new Date()): string {
  return format(value, 'yyyy-MM-dd')
}

export function todayInputValue(): string {
  return toDateInputValue(new Date())
}

export function maxDateInputValue(daysAhead: number): string {
  return toDateInputValue(addDays(new Date(), daysAhead))
}

export function upcomingDateValues(count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    toDateInputValue(addDays(new Date(), index))
  )
}

export function formatWeekdayDay(value: DateInput): string {
  return format(toDate(value), 'EEE d', { locale: es })
}
