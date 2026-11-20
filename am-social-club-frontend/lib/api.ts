import type { ApiResponse } from './types'
import { getToken } from './token'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const TIMEOUT_MS = 30000

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}

export const CONNECTION_ERROR = {
  OFFLINE: 'Sin conexión a internet. Revisa tu red e inténtalo de nuevo.',
  UNREACHABLE:
    'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  TIMEOUT: 'El servidor tardó demasiado en responder. Inténtalo de nuevo.',
  UNAVAILABLE:
    'El servidor no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
  SERVER_ERROR:
    'Ocurrió un error en el servidor. Inténtalo de nuevo en unos minutos.',
  INVALID_RESPONSE: 'La respuesta del servidor no es válida. Inténtalo de nuevo.',
} as const

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public timestamp: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Friendly message for a failed HTTP response, keyed by status code. */
function serverErrorMessage(status: number): string {
  if (status === 502 || status === 503 || status === 504) {
    return CONNECTION_ERROR.UNAVAILABLE
  }
  if (status >= 500) {
    return CONNECTION_ERROR.SERVER_ERROR
  }
  return CONNECTION_ERROR.INVALID_RESPONSE
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  // Fail fast when the browser already knows it is offline.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError(CONNECTION_ERROR.OFFLINE, 0, new Date().toISOString())
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(CONNECTION_ERROR.TIMEOUT, 0, new Date().toISOString())
    }
    // fetch() throws a TypeError ("Failed to fetch") on network errors:
    // server down, DNS failure, CORS blocked, mixed content, etc.
    throw new ApiError(CONNECTION_ERROR.UNREACHABLE, 0, new Date().toISOString())
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>('GET', path)
}

export async function apiPost<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  return apiRequest<T>('POST', path, body, headers)
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>('PUT', path, body)
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>('DELETE', path)
}

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const url = `${API_BASE}${path}`
  const token = getToken()
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const options: RequestInit = {
    method,
    headers,
  }

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body)
  }

  const response = await fetchWithTimeout(url, options, TIMEOUT_MS)
  const status = response.status
  const timestamp = new Date().toISOString()

  let json: ApiResponse<T> | null = null
  try {
    json = (await response.json()) as ApiResponse<T>
  } catch {
    // Non-JSON body: a proxy/gateway error page (502/503/504), a crash, etc.
    json = null
  }

  if (!json) {
    throw new ApiError(serverErrorMessage(status), status, timestamp)
  }

  if (!json.success) {
    throw new ApiError(
      json.error || serverErrorMessage(status),
      status,
      json.timestamp ?? timestamp
    )
  }

  if (json.data === undefined) {
    throw new ApiError(serverErrorMessage(status), status, timestamp)
  }

  return json.data
}

export { ApiError }
