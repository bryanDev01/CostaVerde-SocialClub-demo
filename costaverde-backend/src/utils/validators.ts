import { ValidationError } from './errors.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const PHONE_REGEX = /^[0-9+\s-]{6,20}$/

const CI_REGEX = /^[0-9]{11}$/

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone)
}

export function isValidCI(ci: string): boolean {
  return CI_REGEX.test(ci)
}

export function isRequiredString(value: string, fieldName: string): void {
  if (!value || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required`)
  }
}

export function isPositiveInt(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer`)
  }
}

export function isPositiveNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number`)
  }
}
