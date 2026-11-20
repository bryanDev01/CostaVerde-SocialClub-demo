import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/activities',
  '/reservations',
  '/profile',
  '/payment',
  '/admin',
  '/hr',
  '/receptionist',
] as const

const AUTH_PAGES = ['/login', '/register'] as const

const TOKEN_COOKIE = 'auth_token'

/**
 * Cheap JWT validity check (expiry only, no signature verification).
 * The previous version only checked cookie *existence*, so a stale/invalid
 * cookie made the proxy bounce /login -> /dashboard forever while the client
 * (without a valid token) bounced /dashboard -> /login: an infinite reload loop.
 */
function isValidToken(token: string | undefined): boolean {
  if (!token) return false
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded)) as { exp?: number }

    if (typeof payload.exp !== 'number') return false
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

function clearTokenCookie(response: NextResponse): NextResponse {
  response.cookies.set(TOKEN_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value
  const valid = isValidToken(token)
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  if (isProtected) {
    if (valid) {
      return NextResponse.next()
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    // Delete the stale cookie so /login is not bounced straight back here.
    return clearTokenCookie(NextResponse.redirect(url))
  }

  if (AUTH_PAGES.some((page) => pathname === page)) {
    // The proxy cannot verify the signature, so it must not decide that a
    // session is alive. The login page asks the API and redirects only when
    // the session is really valid. Here we only drop cookies that are expired.
    if (token && !valid) {
      return clearTokenCookie(NextResponse.next())
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/activities/:path*',
    '/reservations/:path*',
    '/profile/:path*',
    '/payment/:path*',
    '/admin/:path*',
    '/hr/:path*',
    '/receptionist/:path*',
    '/login',
    '/register',
  ],
}
