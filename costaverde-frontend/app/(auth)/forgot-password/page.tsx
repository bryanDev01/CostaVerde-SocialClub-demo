'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, KeyRound, Loader2, Mail, MailCheck } from 'lucide-react'
import { apiPost } from '@/lib/api'
import { describeApiError } from '@/lib/errorMessages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/Common/FormField'
import { FormAlert } from '@/components/Common/FormAlert'

interface ForgotPasswordResponse {
  sent: boolean
  dev_reset_url: string | null
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('El correo no tiene un formato válido')
      return
    }

    setLoading(true)
    try {
      const result = await apiPost<ForgotPasswordResponse>(
        '/api/auth/forgot-password',
        { email: email.trim() }
      )
      setDevResetUrl(result.dev_reset_url)
      setSent(true)
    } catch (err) {
      setError(describeApiError(err, 'No se pudo enviar el enlace de recuperación'))
    } finally {
      setLoading(false)
    }
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

      {sent ? (
        <div className="mt-8">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <MailCheck className="size-6" aria-hidden />
          </span>
          <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Revisa tu correo
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Si <span className="font-medium text-foreground">{email.trim()}</span>{' '}
            está registrado, te enviamos un enlace para restablecer tu
            contraseña. El enlace vence en 30 minutos.
          </p>

          <div className="mt-6 rounded-2xl border border-border bg-muted/50 p-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              ¿No lo ves? Revisa la carpeta de spam o intenta de nuevo con otro
              correo.
            </p>
          </div>

          {devResetUrl ? (
            <div className="mt-5 rounded-2xl border border-danger/20 bg-danger/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-danger">
                Modo desarrollo
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                No hay envío de correo configurado aún. Usa este enlace para
                continuar:
              </p>
              <Link
                href={devResetUrl}
                className="mt-2 block break-all font-mono text-xs text-primary hover:underline"
              >
                {devResetUrl}
              </Link>
            </div>
          ) : null}

          <Button variant="outline" className="mt-8 h-11 w-full bg-background" asChild>
            <Link href="/login">Volver a iniciar sesión</Link>
          </Button>
        </div>
      ) : (
        <>
          <header className="mt-8">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="size-6" aria-hidden />
            </span>
            <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Recupera tu contraseña
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Escribe el correo con el que te registraste y te enviaremos un
              enlace para crear una nueva contraseña.
            </p>
          </header>

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

            <Button
              type="submit"
              className="h-12 w-full text-[15px] font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Enviando...
                </>
              ) : (
                'Enviar enlace de recuperación'
              )}
            </Button>
          </form>

          <div className="mt-9 rounded-2xl border border-border bg-muted/60 p-5 text-center">
            <p className="text-sm text-muted-foreground">¿Recordaste tu contraseña?</p>
            <Button variant="outline" className="mt-3 h-11 w-full bg-background" asChild>
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
