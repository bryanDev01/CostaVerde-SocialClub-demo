'use client'

import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/Common/FormField'
import { FormAlert } from '@/components/Common/FormAlert'
import { useAssociateActions } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import { associateSchema, type AssociateFormValues } from '@/lib/validation'
import { FAMILY_RELATIONS } from '@/lib/constants'
import type { Associate } from '@/lib/types'

interface AssociateFormProps {
  associate?: Associate | null
  onSuccess: () => void
  onCancel: () => void
}

export function AssociateForm({ associate, onSuccess, onCancel }: AssociateFormProps) {
  const isEditing = Boolean(associate)
  const { createAssociate, updateAssociate } = useAssociateActions()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AssociateFormValues>({
    resolver: zodResolver(associateSchema),
    defaultValues: {
      ci: associate?.ci ?? '',
      name: associate?.name ?? '',
      phone: associate?.phone ?? '',
      relation: associate?.relation ?? 'spouse',
      date_of_birth: associate?.date_of_birth?.slice(0, 10) ?? '',
    },
  })

  const onSubmit = async (values: AssociateFormValues) => {
    setSubmitError(null)
    try {
      const payload = {
        name: values.name.trim(),
        phone: values.phone?.trim() ? values.phone.trim() : undefined,
        relation: values.relation,
        date_of_birth: values.date_of_birth?.trim()
          ? values.date_of_birth.trim()
          : undefined,
      }

      if (isEditing && associate) {
        await updateAssociate(associate.id, payload)
        toast.success('Acompañante actualizado.')
      } else {
        await createAssociate({ ...payload, ci: values.ci.trim() })
        toast.success('Acompañante agregado correctamente.')
      }

      onSuccess()
    } catch (error) {
      setSubmitError(describeApiError(error, 'No se pudo guardar el acompañante'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {submitError ? <FormAlert>{submitError}</FormAlert> : null}

      <FormField label="Nombre completo" htmlFor="associate-name">
        <Input
          id="associate-name"
          autoComplete="off"
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
        <FormField
          label="Carnet de identidad"
          htmlFor="associate-ci"
          hint={isEditing ? 'No editable' : '11 dígitos'}
        >
          <Input
            id="associate-ci"
            inputMode="numeric"
            maxLength={11}
            autoComplete="off"
            className="h-12 font-mono tracking-wider"
            aria-invalid={errors.ci ? true : undefined}
            disabled={isSubmitting || isEditing}
            {...register('ci')}
          />
          {errors.ci ? (
            <p className="text-xs font-medium text-danger" role="alert">
              {errors.ci.message}
            </p>
          ) : null}
        </FormField>

        <FormField label="Parentesco" htmlFor="associate-relation">
          <Controller
            control={control}
            name="relation"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id="associate-relation"
                  aria-invalid={errors.relation ? true : undefined}
                >
                  <SelectValue placeholder="Selecciona el parentesco" />
                </SelectTrigger>
                <SelectContent>
                  {FAMILY_RELATIONS.map((relation) => (
                    <SelectItem key={relation.value} value={relation.value}>
                      {relation.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.relation ? (
            <p className="text-xs font-medium text-danger" role="alert">
              {errors.relation.message}
            </p>
          ) : null}
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Teléfono" htmlFor="associate-phone" hint="Opcional">
          <Input
            id="associate-phone"
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

        <FormField label="Fecha de nacimiento" htmlFor="associate-dob" hint="Opcional">
          <Input
            id="associate-dob"
            type="date"
            max="2100-12-31"
            className="h-12"
            aria-invalid={errors.date_of_birth ? true : undefined}
            disabled={isSubmitting}
            {...register('date_of_birth')}
          />
          {errors.date_of_birth ? (
            <p className="text-xs font-medium text-danger" role="alert">
              {errors.date_of_birth.message}
            </p>
          ) : null}
        </FormField>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-11 bg-background"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" className="h-11" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Guardando...
            </>
          ) : isEditing ? (
            'Guardar cambios'
          ) : (
            'Agregar acompañante'
          )}
        </Button>
      </div>
    </form>
  )
}
