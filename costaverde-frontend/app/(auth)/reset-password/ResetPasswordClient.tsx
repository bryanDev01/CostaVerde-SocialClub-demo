'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import { describeApiError } from '@/lib/errorMessages'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/Common/FormField'
import { FormAlert } from '@/components/Common/FormAlert'
import { PasswordInput } from '@/components/Common/PasswordInput'

type Status = 'checking' | 'invalid' | 'ready'

export function ResetPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<Status>(token ? 'checking' : 'invalid')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) return

    let active = true

    apiGet<{ valid: boolean }>(
      `/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`
    )
      .then((result) => {
        if (!active) return
        setStatus(result.valid ? 'ready' : 'invalid')
      })
      .catch(() => {
        if (!active) return
        setStatus('invalid')
      })

    return () => {
      active = false
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      await apiPost('/api/auth/reset-password', { token, password })
      router.replace('/login?reset=true')
    } catch (err) {
      setError(describeApiError(err, 'No se pudo restablecer la contraseña'))
    } finally {
      setLoading(false)
    }
  }

  if (status === 'checking') {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-primary" aria-hidden />
          <p className="mt-4 text-sm text-muted-foreground">
            Validando el enlace de recuperación...
          </p>
        </div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="animate-fade-up text-center motion-reduce:animate-none">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger/10 text-danger">
          <AlertTriangle className="size-6" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Enlace inválido o vencido
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Este enlace de recuperación ya no es válido. Los enlaces vencen a los
          30 minutos y solo pueden usarse una vez.
        </p>
        <Button className="mt-8 h-11 w-full" asChild>
          <Link href="/forgot-password">Solicitar un nuevo enlace</Link>
        </Button>
        <Button variant="ghost" className="mt-2 h-11 w-full" asChild>
          <Link href="/login">Volver a iniciar sesión</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-up motion-reduce:animate-none">
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver a iniciar sesión
      </Link>

      <header className="mt-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Nueva contraseña
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Crea una contraseña nueva y segura para tu cuenta.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-9 space-y-5" noValidate>
        {error ? <FormAlert>{error}</FormAlert> : null}

        <FormField label="Nueva contraseña" htmlFor="password">
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <PasswordInput
              id="password"
              name="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className="pl-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </FormField>

        <FormField label="Confirmar contraseña" htmlFor="confirmPassword">
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
              className="pl-11"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </FormField>

        <Button
          type="submit"
          className="h-12 w-full text-[15px] font-semibold"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Guardando...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" aria-hidden />
              Restablecer contraseña
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
