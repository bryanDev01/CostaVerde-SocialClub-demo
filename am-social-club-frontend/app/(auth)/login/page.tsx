'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, Lock, Mail } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { login } from '@/lib/auth'
import { describeApiError } from '@/lib/errorMessages'
import { defaultRouteForUser } from '@/lib/staff'
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/Common/FormField'
import { FormAlert } from '@/components/Common/FormAlert'
import { PasswordInput } from '@/components/Common/PasswordInput'

function LoginNotice() {
  const searchParams = useSearchParams()
  const registered = searchParams.get('registered') === 'true'
  const reset = searchParams.get('reset') === 'true'

  if (!registered && !reset) return null

  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <p className="text-sm leading-relaxed text-foreground">
        {reset
          ? 'Tu contraseña se restableció correctamente. Inicia sesión con tu nueva contraseña.'
          : 'Tu cuenta se creó correctamente. Inicia sesión para activar tu suscripción.'}
      </p>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { user: sessionUser, loading: sessionLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Only the API can confirm a session. If it does, go straight to the right panel.
  // If the API cannot be reached, the form stays usable so the user can try to log in.
  useEffect(() => {
    if (sessionLoading || loading || !sessionUser) return
    const restricted =
      sessionUser.user_status === 'pending_payment' || sessionUser.user_status === 'suspended'
    router.replace(restricted ? '/payment/required' : defaultRouteForUser(sessionUser))
  }, [sessionUser, sessionLoading, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const user = await login(email, password)

      if (user.user_status === 'pending_payment' || user.user_status === 'suspended') {
        router.push('/payment/required')
        return
      }

      router.push(defaultRouteForUser(user))
    } catch (err) {
      setError(describeApiError(err, 'No pudimos iniciar sesión. Inténtalo de nuevo en unos minutos.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-up motion-reduce:animate-none">
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver al inicio
      </Link>

      <header className="mt-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Inicia sesión
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Accede con el correo que registraste para gestionar tus reservas y tu
          suscripción.
        </p>
      </header>

      <Suspense fallback={null}>
        <LoginNotice />
      </Suspense>

      <form onSubmit={handleSubmit} className="mt-9 space-y-5" noValidate>
        {error ? <FormAlert>{error}</FormAlert> : null}

        <FormField label="Correo electrónico" htmlFor="email">
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="nombre@correo.cu"
              autoComplete="email"
              className="h-12 pl-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </FormField>

        <FormField label="Contraseña" htmlFor="password">
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <PasswordInput
              id="password"
              name="password"
              placeholder="Tu contraseña"
              autoComplete="current-password"
              className="pl-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </FormField>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              name="remember"
              className="size-4 rounded border-input accent-primary"
            />
            Recordarme
          </label>
          <Link
            href="/forgot-password"
            className="rounded-md text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button
          type="submit"
          className="h-12 w-full text-[15px] font-semibold"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Iniciando sesión...
            </>
          ) : (
            'Iniciar sesión'
          )}
        </Button>
      </form>

      <div className="mt-9 rounded-2xl border border-border bg-muted/60 p-5 text-center">
        <p className="text-sm text-muted-foreground">¿Aún no tienes cuenta?</p>
        <Button variant="outline" className="mt-3 h-11 w-full bg-background" asChild>
          <Link href="/register">Crear cuenta con mi CI</Link>
        </Button>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
        ¿Problemas para entrar? Escribe a{' '}
        <span className="font-medium text-foreground">{SUPPORT_EMAIL}</span>{' '}
        o llama al {SUPPORT_PHONE}.
      </p>
    </div>
  )
}
