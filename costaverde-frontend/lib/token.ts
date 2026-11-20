export const TOKEN_KEY = 'auth_token'

/**
 * Returns the session token.
 *
 * localStorage is the primary source, but the session cookie (the one
 * proxy.ts trusts for route gating) is used as a fallback. Keeping both
 * readable prevents redirect loops when the two get out of sync: the proxy
 * would keep bouncing /login -> /dashboard while the client (without a
 * token) kept bouncing /dashboard -> /login.
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null

  const stored = window.localStorage.getItem(TOKEN_KEY)
  if (stored) return stored

  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]*)`)
  )
  if (!match?.[1]) return null

  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}
