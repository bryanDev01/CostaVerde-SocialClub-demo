'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { UserProfile } from '@/lib/types'
import { getCurrentUser, isAuthenticated, logout, AUTH_CHANGED_EVENT } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { describeApiError } from '@/lib/errorMessages'

interface AuthState {
  user: UserProfile | null
  error: string | null
}

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  error: string | null
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  refreshUser: async () => {},
})

async function loadUser(): Promise<AuthState> {
  if (!isAuthenticated()) {
    return { user: null, error: null }
  }

  try {
    return { user: await getCurrentUser(), error: null }
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      // Token rejected by the API: clear the whole session (cookie included)
      // so the proxy stops bouncing /login <-> /dashboard with a stale cookie.
      logout()
      return { user: null, error: null }
    }
    // Transient failure (network/backend down): keep the token and surface
    // the error so AuthWrapper shows a retry instead of redirecting.
    return {
      user: null,
      error: describeApiError(err, 'No se pudo cargar la sesión'),
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    loadUser().then((state) => {
      if (!active) return
      setUser(state.user)
      setError(state.error)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  const refreshUser = useCallback(async () => {
    setLoading(true)
    setError(null)
    const state = await loadUser()
    setUser(state.user)
    setError(state.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    const handleAuthChanged = () => {
      setUser(null)
      void refreshUser()
    }

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged)
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged)
  }, [refreshUser])

  return (
    <AuthContext.Provider value={{ user, loading, error, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
