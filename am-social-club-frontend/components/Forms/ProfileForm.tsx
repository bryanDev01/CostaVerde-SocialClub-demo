'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, IdCard, Loader2, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/Common/FormField'
import { FormAlert } from '@/components/Common/FormAlert'
import { StatusBadge } from '@/components/Common/StatusBadge'
import { useAuth } from '@/app/providers'
import { useProfileActions } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import { resolveMediaUrl } from '@/lib/api'
import { resizeProfileImage, validateProfileImage } from '@/lib/images'
import { profileSchema, type ProfileFormValues } from '@/lib/validation'
import { USER_ROLE_LABELS } from '@/lib/constants'
import { getInitials } from '@/lib/utils'

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  corporate: 'Corporativo',
  external: 'Externo',
}

export function ProfileForm() {
  const { user, refreshUser } = useAuth()
  const { updateProfile, uploadProfilePhoto } = useProfileActions()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    },
  })

  if (!user) return null

  const handleSelectPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const validationError = validateProfileImage(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      setPhotoUploading(true)
      const dataUrl = await resizeProfileImage(file)
      await uploadProfilePhoto(dataUrl)
      await refreshUser()
      toast.success('Foto de perfil actualizada.')
    } catch (error) {
      toast.error(describeApiError(error, 'No se pudo subir la foto'))
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleRemovePhoto = async () => {
    try {
      setPhotoUploading(true)
      await updateProfile({ profile_photo_url: null })
      await refreshUser()
      toast.success('Foto de perfil eliminada.')
    } catch (error) {
      toast.error(describeApiError(error, 'No se pudo eliminar la foto'))
    } finally {
      setPhotoUploading(false)
    }
  }

  const onSubmit = async (values: ProfileFormValues) => {
    setSubmitError(null)
    try {
      await updateProfile({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() ? values.phone.trim() : undefined,
      })
      await refreshUser()
      reset(values)
      toast.success('Datos actualizados correctamente.')
    } catch (error) {
      setSubmitError(
        describeApiError(error, 'No se pudieron guardar los cambios')
      )
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
      <header>
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
          Datos personales
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Mantén actualizada tu información de contacto para recibir avisos de
          reservas y pagos.
        </p>
      </header>

      <div className="mt-5 flex items-center gap-4">
        <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-primary/10 font-display text-xl font-semibold text-primary">
          {user.profile_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto de perfil servida por la API
            <img
              src={resolveMediaUrl(user.profile_photo_url) ?? undefined}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            getInitials(user.name)
          )}
        </span>

        <div className="min-w-0">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            tabIndex={-1}
            aria-hidden
            onChange={handleSelectPhoto}
            disabled={photoUploading}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-background"
              disabled={photoUploading}
              onClick={() => photoInputRef.current?.click()}
            >
              {photoUploading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Camera className="size-4" aria-hidden />
              )}
              {user.profile_photo_url ? 'Cambiar foto' : 'Subir foto'}
            </Button>
            {user.profile_photo_url ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={photoUploading}
                onClick={handleRemovePhoto}
              >
                <Trash2 className="size-4" aria-hidden />
                Quitar
              </Button>
            ) : null}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            JPG, PNG o WebP · máximo 5 MB. La imagen se recorta a 320 px.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 p-4">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <IdCard className="size-4 text-primary" aria-hidden />
          CI
          <span className="font-mono text-sm font-semibold text-foreground">
            {user.ci}
          </span>
        </span>
        <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {ACCOUNT_TYPE_LABELS[user.user_type] ?? user.user_type}
        </span>
        {user.role_name ? (
          <span className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {USER_ROLE_LABELS[user.role_name] ?? user.role_name}
          </span>
        ) : null}
        <StatusBadge status={user.user_status} scope="user" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
        {submitError ? <FormAlert>{submitError}</FormAlert> : null}

        <FormField label="Nombre completo" htmlFor="name">
          <Input
            id="name"
            autoComplete="name"
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

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Correo electrónico" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="h-12"
              aria-invalid={errors.email ? true : undefined}
              disabled={isSubmitting}
              {...register('email')}
            />
            {errors.email ? (
              <p className="text-xs font-medium text-danger" role="alert">
                {errors.email.message}
              </p>
            ) : null}
          </FormField>

          <FormField label="Teléfono" htmlFor="phone" hint="Opcional">
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
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
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            className="h-11"
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Guardando...
              </>
            ) : (
              <>
                <Save className="size-4" aria-hidden />
                Guardar cambios
              </>
            )}
          </Button>
          {isDirty && !isSubmitting ? (
            <p className="text-xs text-muted-foreground">Tienes cambios sin guardar</p>
          ) : null}
        </div>
      </form>
    </section>
  )
}
