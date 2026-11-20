import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Human-friendly membership code derived from the user id (UUID).
 * Example: AMSC-4F2A-91C0. Reception can read it aloud / write it down.
 */
export function membershipNumber(userId: string): string {
  const hex = userId.replace(/-/g, '').toUpperCase().slice(0, 8)
  return `AMSC-${hex.slice(0, 4)}-${hex.slice(4, 8)}`
}
