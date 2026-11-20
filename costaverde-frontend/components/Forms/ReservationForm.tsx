'use client'

import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Activity as ActivityIcon,
  CalendarDays,
  CheckCircle2,
  CalendarClock,
  Globe,
  Info,
  Loader2,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/Common/FormField'
import { FormAlert } from '@/components/Common/FormAlert'
import { useAuth } from '@/app/providers'
import { describeApiError } from '@/lib/errorMessages'
import {
  useActivities,
  useAffinityCheck,
  useReservationActions,
} from '@/lib/hooks'
import { reservationSchema, type ReservationFormValues } from '@/lib/validation'
import { formatDate, todayInputValue } from '@/lib/dates'
import { MAX_ASSOCIATES, MAX_RESERVATIONS_PER_WEEK, GLOBAL_DAILY_CAPACITY } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { AffinityCheckResult } from '@/lib/types'

const REASON_LABELS: Record<string, string> = {
  'Activity capacity exceeded':
    'No hay cupos suficientes en esta actividad para la fecha seleccionada.',
  'Global daily capacity exceeded':
    'El aforo global del club para ese día está completo.',
  'Weekly reservation limit reached': `Ya alcanzaste el límite de ${MAX_RESERVATIONS_PER_WEEK} reservas activas esta semana.`,
  'Corporate priority window: external quota (20%) exceeded for this date':
    'Durante la ventana de prioridad corporativa (más de 48 h antes), la cuota para visitantes externos está completa. Intenta más cerca de la fecha.',
}

const QUANTITY_OPTIONS = Array.from({ length: MAX_ASSOCIATES + 1 }, (_, index) => {
  const value = index + 1
  if (value === 1) return { value, label: 'Solo yo (1 persona)' }
  return {
    value,
    label: `${value} personas (yo + ${value - 1} ${
      value - 1 === 1 ? 'acompañante' : 'acompañantes'
    })`,
  }
})

interface AffinityRowProps {
  icon: typeof ActivityIcon
  label: string
  ok: boolean
  detail: string
}

function AffinityRow({ icon: Icon, label, ok, detail }: AffinityRowProps) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
          ok ? 'bg-primary/10 text-primary' : 'bg-danger/10 text-danger'
        )}
      >
        {ok ? (
          <CheckCircle2 className="size-3.5" aria-hidden />
        ) : (
          <XCircle className="size-3.5" aria-hidden />
        )}
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Icon className="size-3.5 text-muted-foreground" aria-hidden />
          {label}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </li>
  )
}

interface AffinityPanelProps {
  checking: boolean
  error: string | null
  result: AffinityCheckResult | null
  activityName: string | null
  reservationDate: string | null
  quantity: number
  isExternal: boolean
}

function AffinityPanel({
  checking,
  error,
  result,
  activityName,
  reservationDate,
  quantity,
  isExternal,
}: AffinityPanelProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <FormAlert>{error}</FormAlert>
      </div>
    )
  }

  if (checking && !result) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm" aria-busy>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
          Verificando disponibilidad...
        </div>
        <div className="mt-5 space-y-4">
          {[0, 1, 2].map((row) => (
            <div key={row} className="animate-pulse space-y-2 motion-reduce:animate-none">
              <div className="h-3.5 w-2/3 rounded-full bg-muted" />
              <div className="h-3 w-1/2 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
        <Info className="mx-auto size-6 text-primary/50" aria-hidden />
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Selecciona una actividad y una fecha para consultar la disponibilidad
          en tiempo real.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Disponibilidad
        </p>
        {checking ? (
          <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />
        ) : null}
      </div>

      {activityName && reservationDate ? (
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{activityName}</span> ·{' '}
          {formatDate(reservationDate)} ·{' '}
          {quantity === 1 ? '1 persona' : `${quantity} personas`}
        </p>
      ) : null}

      <div
        className={cn(
          'mt-5 flex items-start gap-3 rounded-xl border p-4',
          result.can_reserve
            ? 'border-primary/20 bg-primary/5'
            : 'border-danger/20 bg-danger/5'
        )}
      >
        {result.can_reserve ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        ) : (
          <XCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
        )}
        <div>
          <p
            className={cn(
              'text-sm font-semibold',
              result.can_reserve ? 'text-primary' : 'text-danger'
            )}
          >
            {result.can_reserve ? 'Disponibilidad confirmada' : 'No disponible'}
          </p>
          {!result.can_reserve ? (
            <p className="mt-1 text-xs leading-relaxed text-danger/90">
              {REASON_LABELS[result.reason ?? ''] ??
                result.reason ??
                'La reserva no está disponible para los datos seleccionados.'}
            </p>
          ) : null}
        </div>
      </div>

      <ul className="mt-5 space-y-4">
        <AffinityRow
          icon={ActivityIcon}
          label="Cupos de la actividad"
          ok={result.activity_available}
          detail={`${result.activity_remaining} cupos disponibles`}
        />
        <AffinityRow
          icon={Globe}
          label="Aforo global del día"
          ok={result.global_available}
          detail={`${result.global_remaining} de ${GLOBAL_DAILY_CAPACITY} cupos`}
        />
        <AffinityRow
          icon={CalendarDays}
          label="Tus reservas esta semana"
          ok={result.weekly_available}
          detail={`${result.weekly_count} de ${MAX_RESERVATIONS_PER_WEEK} reservas activas`}
        />
        {isExternal && result.priority_window_available === false ? (
          <AffinityRow
            icon={ShieldCheck}
            label="Ventana de prioridad corporativa"
            ok={false}
            detail="Cuota para visitantes externos completa hasta 48 h antes de la fecha."
          />
        ) : null}
      </ul>

      <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        El aforo se verifica nuevamente con bloqueo seguro al confirmar tu
        reserva.
      </p>
    </div>
  )
}

interface ReservationFormProps {
  initialActivityId?: string
  initialDate?: string
}

export function ReservationForm({
  initialActivityId,
  initialDate,
}: ReservationFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { activities, loading: activitiesLoading, error: activitiesError } = useActivities()
  const { createReservation } = useReservationActions()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      activity_id: initialActivityId ?? '',
      reservation_date: initialDate ?? '',
      quantity: 1,
      notes: '',
    },
  })

  const activityId = useWatch({ control, name: 'activity_id' })
  const reservationDate = useWatch({ control, name: 'reservation_date' })
  const quantity = useWatch({ control, name: 'quantity' })

  const { result, error: affinityError, checking } = useAffinityCheck(
    activityId || null,
    reservationDate || null,
    Number(quantity)
  )

  const activeActivities = activities.filter(
    (activity) => activity.is_active && activity.is_reservable
  )
  const selectedActivity = activeActivities.find((activity) => activity.id === activityId)

  const canSubmit =
    result?.can_reserve === true && !checking && !isSubmitting && !activitiesError
  const isExternal = user?.user_type === 'external'

  const onSubmit = async (values: ReservationFormValues) => {
    setSubmitError(null)
    try {
      const reservation = await createReservation({
        activity_id: values.activity_id,
        reservation_date: values.reservation_date,
        quantity: Number(values.quantity),
        notes: values.notes?.trim() ? values.notes.trim() : undefined,
      })
      toast.success('¡Reserva confirmada! Te esperamos en el club.')
      router.push(`/reservations/${reservation.id}`)
    } catch (error) {
      setSubmitError(
        describeApiError(error, 'No se pudo crear la reserva')
      )
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {submitError ? <FormAlert>{submitError}</FormAlert> : null}
        {activitiesError ? (
          <FormAlert>No se pudieron cargar las actividades: {activitiesError}</FormAlert>
        ) : null}

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
          <div className="space-y-6">
            <FormField label="Actividad" htmlFor="activity_id">
              <Controller
                control={control}
                name="activity_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={activitiesLoading || isSubmitting}
                  >
                    <SelectTrigger
                      id="activity_id"
                      aria-invalid={errors.activity_id ? true : undefined}
                    >
                      <SelectValue
                        placeholder={
                          activitiesLoading
                            ? 'Cargando actividades...'
                            : 'Selecciona una actividad'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {activeActivities.map((activity) => (
                        <SelectItem key={activity.id} value={activity.id}>
                          {activity.name} · {activity.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.activity_id ? (
                <p className="text-xs font-medium text-danger" role="alert">
                  {errors.activity_id.message}
                </p>
              ) : null}
            </FormField>

            <FormField
              label="Fecha de la reserva"
              htmlFor="reservation_date"
              hint="Mínimo hoy"
            >
              <Input
                id="reservation_date"
                type="date"
                min={todayInputValue()}
                className="h-12"
                aria-invalid={errors.reservation_date ? true : undefined}
                disabled={isSubmitting}
                {...register('reservation_date')}
              />
              {errors.reservation_date ? (
                <p className="text-xs font-medium text-danger" role="alert">
                  {errors.reservation_date.message}
                </p>
              ) : null}
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Te enviaremos un recordatorio{' '}
                  <span className="font-semibold text-foreground">48 horas antes</span>{' '}
                  del día reservado. Debes confirmar tu asistencia; si no lo haces
                  antes de que empiece ese día, la reserva se libera y los cupos
                  vuelven a estar disponibles.
                </p>
              </div>
            </FormField>

            <FormField label="¿Cuántas personas?" htmlFor="quantity">
              <Controller
                control={control}
                name="quantity"
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="quantity"
                      aria-invalid={errors.quantity ? true : undefined}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUANTITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.quantity ? (
                <p className="text-xs font-medium text-danger" role="alert">
                  {errors.quantity.message}
                </p>
              ) : null}
              <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <Users className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Puedes incluir hasta {MAX_ASSOCIATES} acompañantes registrados en
                tu perfil.
              </p>
            </FormField>

            <FormField label="Notas" htmlFor="notes" hint="Opcional">
              <Textarea
                id="notes"
                placeholder="Cumpleaños, necesidades especiales, comentarios para recepción..."
                maxLength={500}
                disabled={isSubmitting}
                {...register('notes')}
              />
            </FormField>
          </div>
        </div>

        <Button
          type="submit"
          className="h-12 w-full text-[15px] font-semibold"
          disabled={!canSubmit}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Creando reserva...
            </>
          ) : checking ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Verificando disponibilidad...
            </>
          ) : (
            'Confirmar reserva'
          )}
        </Button>
      </form>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <AffinityPanel
          checking={checking}
          error={affinityError}
          result={result}
          activityName={selectedActivity?.name ?? null}
          reservationDate={reservationDate || null}
          quantity={Number(quantity)}
          isExternal={isExternal}
        />
      </div>
    </div>
  )
}
