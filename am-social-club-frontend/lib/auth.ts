import { apiPost, apiGet } from './api'
import type { UserProfile } from './types'
import { TOKEN_KEY, getToken } from './token'

const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export { getToken }

export const AUTH_CHANGED_EVENT = 'auth-changed'

function notifyAuthChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

interface LoginResponse {
  user: UserProfile
  token: string
}

interface JwtPayload {
  userId: string
  email: string
  role: string
  userType: string
  iat: number
  exp: number
}

function setAuthCookie(token: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${TOKEN_MAX_AGE_SECONDS}; samesite=lax`
}

function clearAuthCookie(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; samesite=lax`
}

export async function login(email: string, password: string): Promise<UserProfile> {
  const response = await apiPost<LoginResponse>('/api/auth/login', { email, password })
  localStorage.setItem(TOKEN_KEY, response.token)
  setAuthCookie(response.token)
  notifyAuthChanged()
  return response.user
}

export function logout(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  clearAuthCookie()
  notifyAuthChanged()
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false

  try {
    const payload = decodeJwt(token)
    if (payload.exp * 1000 < Date.now()) {
      logout()
      return false
    }
    return true
  } catch {
    logout()
    return false
  }
}

export function decodeJwt(token: string): JwtPayload {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token')

  // JWT payloads are base64url ('-', '_'), which atob() rejects as-is.
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const payload = JSON.parse(atob(padded))
  return payload as JwtPayload
}

export async function getCurrentUser(): Promise<UserProfile> {
  return apiGet<UserProfile>('/api/users/me')
}
