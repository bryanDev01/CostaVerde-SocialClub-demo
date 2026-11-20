'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/Common/FormField'
import { FormAlert } from '@/components/Common/FormAlert'
import { usePayment } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import { paymentConfirmSchema, type PaymentConfirmFormValues } from '@/lib/validation'
import type { Payment } from '@/lib/types'

interface PaymentFormProps {
  paymentId: string
  referenceCode?: string
  onSuccess: (payment: Payment) => void
}

export function PaymentForm({ paymentId, referenceCode, onSuccess }: PaymentFormProps) {
  const { confirmTransaction } = usePayment()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentConfirmFormValues>({
    resolver: zodResolver(paymentConfirmSchema),
    defaultValues: {
      payment_id: paymentId,
      transaction_number: '',
    },
  })

  const onSubmit = async (values: PaymentConfirmFormValues) => {
    setSubmitError(null)
    try {
      const payment = await confirmTransaction(values.payment_id, values.transaction_number)
      onSuccess(payment)
    } catch (error) {
      setSubmitError(
        describeApiError(error, 'No se pudo confirmar la transacción')
      )
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <input type="hidden" {...register('payment_id')} />

      {submitError ? <FormAlert>{submitError}</FormAlert> : null}

      {referenceCode ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/50 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Código de referencia
          </span>
          <span className="font-mono text-sm font-semibold text-foreground">
            {referenceCode}
          </span>
        </div>
      ) : null}

      <FormField
        label="Número de transacción"
        htmlFor="transaction_number"
        hint="Aparece en el SMS de Transfermóvil"
      >
        <Input
          id="transaction_number"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Ej. 1234567890"
          className="h-12 font-mono tracking-wider"
          aria-invalid={errors.transaction_number ? true : undefined}
          disabled={isSubmitting}
          {...register('transaction_number')}
        />
        {errors.transaction_number ? (
          <p className="text-xs font-medium text-danger" role="alert">
            {errors.transaction_number.message}
          </p>
        ) : null}
      </FormField>

      <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
        Un administrador comparará tu transacción con el SMS bancario. La
        validación puede tardar hasta 24 horas; tu suscripción se activa
        automáticamente al aprobarse.
      </div>

      <Button
        type="submit"
        className="h-12 w-full text-[15px] font-semibold"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Confirmando...
          </>
        ) : (
          'Confirmar transacción'
        )}
      </Button>
    </form>
  )
}
