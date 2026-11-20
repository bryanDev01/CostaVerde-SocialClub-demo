'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, IdCard, Loader2, Mail, Phone } from 'lucide-react'
import { apiPost } from '@/lib/api'
import { describeApiError } from '@/lib/errorMessages'
import { HR_EMAIL } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/Common/FormField'
import { FormAlert } from '@/components/Common/FormAlert'
import { PasswordInput } from '@/components/Common/PasswordInput'
import type { User } from '@/lib/types'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    ci: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (formData.ci.length !== 11 || !/^\d+$/.test(formData.ci)) {
      setError('El CI debe tener 11 dígitos')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('El correo no tiene un formato válido')
      return
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (!acceptedTerms) {
      setError('Debes aceptar los términos de servicio y la política de privacidad para crear tu cuenta.')
      return
    }

    setLoading(true)

    try {
      await apiPost<User>('/api/auth/register', {
        ci: formData.ci,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
      })

      router.push('/login?registered=true')
    } catch (err) {
      setError(describeApiError(err, 'Error al registrarse'))
    } finally {
      setLoading(false)
    }
  }

  const handleChange =
    (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [field]: e.target.value })
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
          Crea tu cuenta
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Si Recursos Humanos ya precargó tus datos, valida tu CI y comienza a
          reservar.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-9 space-y-5" noValidate>
        {error ? <FormAlert>{error}</FormAlert> : null}

        <FormField label="Carnet de identidad" htmlFor="ci" hint="11 dígitos">
          <div className="relative">
            <IdCard
              className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="ci"
              name="ci"
              type="text"
              inputMode="numeric"
              placeholder="12345678901"
              autoComplete="off"
              className="h-12 pl-11"
              value={formData.ci}
              onChange={handleChange('ci')}
              maxLength={11}
              required
              disabled={loading}
            />
          </div>
        </FormField>

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
              value={formData.email}
              onChange={handleChange('email')}
              required
              disabled={loading}
            />
          </div>
        </FormField>

        <FormField label="Teléfono" htmlFor="phone" hint="Opcional">
          <div className="relative">
            <Phone
              className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+53 5555 5555"
              autoComplete="tel"
              className="h-12 pl-11"
              value={formData.phone}
              onChange={handleChange('phone')}
              disabled={loading}
            />
          </div>
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Contraseña" htmlFor="password">
            <PasswordInput
              id="password"
              name="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange('password')}
              required
              disabled={loading}
            />
          </FormField>

          <FormField label="Confirmar contraseña" htmlFor="confirmPassword">
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              required
              disabled={loading}
            />
          </FormField>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            required
            aria-invalid={!acceptedTerms && error !== null}
            className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
          />
          <span>
            Acepto los términos de servicio y la política de privacidad del
            club, y confirmo que los datos ingresados son correctos.
          </span>
        </label>

        <Button
          type="submit"
          className="h-12 w-full text-[15px] font-semibold"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Creando cuenta...
            </>
          ) : (
            'Crear cuenta'
          )}
        </Button>
      </form>

      <div className="mt-9 rounded-2xl border border-border bg-muted/60 p-5 text-center">
        <p className="text-sm text-muted-foreground">¿Ya tienes cuenta?</p>
        <Button variant="outline" className="mt-3 h-11 w-full bg-background" asChild>
          <Link href="/login">Iniciar sesión</Link>
        </Button>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
        Tu CI debe coincidir con la precarga hecha por Recursos Humanos. Si no
        aparece, contacta a <span className="font-medium text-foreground">{HR_EMAIL}</span>.
      </p>
    </div>
  )
}
