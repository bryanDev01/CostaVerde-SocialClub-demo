'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/Common/FormField'
import { FormAlert } from '@/components/Common/FormAlert'
import { useExternalRegistration } from '@/lib/hooks'
import { externalUserSchema, type ExternalUserFormValues } from '@/lib/validation'
import type { UserProfile } from '@/lib/types'

const API_ERROR_LABELS: Record<string, string> = {
  'Invalid CI format. Expected 11 digits.':
    'El CI debe tener exactamente 11 dígitos.',
  'Name is required': 'El nombre del visitante es obligatorio.',
  'Invalid phone format': 'El teléfono no tiene un formato válido.',
  'A user with this CI already exists': 'Ya existe un usuario con ese CI.',
}

function translateError(message: string | undefined): string {
  if (!message) return 'No se pudo registrar al visitante'
  return API_ERROR_LABELS[message] ?? message
}

interface RegisterExternalFormProps {
  onSuccess?: (user: UserProfile) => void
}

export function RegisterExternalForm({ onSuccess }: RegisterExternalFormProps) {
  const { registerExternal } = useExternalRegistration()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createdUser, setCreatedUser] = useState<UserProfile | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExternalUserFormValues>({
    resolver: zodResolver(externalUserSchema),
    defaultValues: {
      ci: '',
      name: '',
      phone: '',
    },
  })

  const onSubmit = async (values: ExternalUserFormValues) => {
    setSubmitError(null)
    setCreatedUser(null)
    try {
      const user = await registerExternal({
        ci: values.ci.trim(),
        name: values.name.trim(),
        phone: values.phone?.trim() ? values.phone.trim() : undefined,
      })
      setCreatedUser(user)
      reset()
      onSuccess?.(user)
    } catch (error) {
      setSubmitError(
        translateError(error instanceof Error ? error.message : undefined)
      )
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {submitError ? <FormAlert>{submitError}</FormAlert> : null}

        <FormField
          label="Carnet de identidad"
          htmlFor="external-ci"
          hint="11 dígitos"
        >
          <Input
            id="external-ci"
            inputMode="numeric"
            maxLength={11}
            autoComplete="off"
            placeholder="85010112345"
            className="h-12 font-mono tracking-wider"
            aria-invalid={errors.ci ? true : undefined}
            disabled={isSubmitting}
            {...register('ci')}
          />
          {errors.ci ? (
            <p className="text-xs font-medium text-danger" role="alert">
              {errors.ci.message}
            </p>
          ) : null}
        </FormField>

        <FormField label="Nombre completo" htmlFor="external-name">
          <Input
            id="external-name"
            autoComplete="off"
            placeholder="María Pérez López"
            className="h-12"
            aria-invalid={errors.name ? true : undefined}
            disabled={isSubmitting}
            {...register('name')}
          />
          {errors.name ? (
            <p className="text-xs font-medium text-danger" role="alert">
              {errors.name.message}
            </p>
          ) : null}
        </FormField>

        <FormField label="Teléfono" htmlFor="external-phone" hint="Opcional">
          <Input
            id="external-phone"
            type="tel"
            autoComplete="off"
            placeholder="+53 5555 5555"
            className="h-12"
            aria-invalid={errors.phone ? true : undefined}
            disabled={isSubmitting}
            {...register('phone')}
          />
          {errors.phone ? (
            <p className="text-xs font-medium text-danger" role="alert">
              {errors.phone.message}
            </p>
          ) : null}
        </FormField>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="submit"
            className="h-12 gap-2.5"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Registrando...
              </>
            ) : (
              <>
                <UserPlus className="size-4" aria-hidden />
                Registrar visitante
              </>
            )}
          </Button>
        </div>
      </form>

      <aside aria-labelledby="externo-info">
        <h2
          id="externo-info"
          className="font-display text-lg font-semibold tracking-tight text-foreground"
        >
          {createdUser ? 'Visitante registrado' : 'Sobre este registro'}
        </h2>

        {createdUser ? (
          <div className="mt-4 space-y-3">
            <div
              role="status"
              className="rounded-2xl border border-primary/20 bg-primary/5 p-5"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {createdUser.name}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    CI {createdUser.ci}
                  </p>
                  <span className="mt-3 inline-flex rounded-full border border-primary/30 bg-transparent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Cuenta externa activa
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              El visitante ya puede reservar mediante pago por visita. Se le
              puede generar su carnet digital desde su cuenta cuando se registre.
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground shadow-sm">
            <p>
              Registra aquí a los visitantes externos que llegan sin precarga
              corporativa. Solo se necesita su CI y nombre.
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>La cuenta queda activa de inmediato.</li>
              <li>Pueden reservar actividades como visitantes.</li>
              <li>No requieren suscripción corporativa.</li>
            </ul>
          </div>
        )}
      </aside>
    </div>
  )
}