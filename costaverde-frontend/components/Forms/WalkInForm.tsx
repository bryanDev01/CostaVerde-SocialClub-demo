'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, Loader2, Search, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/Common/FormField'
import { FormAlert } from '@/components/Common/FormAlert'
import {
  useRegisterWalkIn,
  useVisitorAutocomplete,
  type VisitorAutocompleteResult,
} from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { VisitPaymentMethod } from '@/lib/hooks'

const DEFAULT_COLLECTION_CUP = '1500'

const PAYMENT_METHOD_OPTIONS: { value: VisitPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' },
]

const todayIso = () => new Date().toISOString().split('T')[0]

interface WalkInFormValues {
  ci: string
  name: string
  phone: string
  partner_count: string
  visit_date: string
  amount_cup: string
  payment_method: VisitPaymentMethod
  payment_reference: string
}

export function WalkInForm() {
  const [values, setValues] = useState<WalkInFormValues>({
    ci: '',
    name: '',
    phone: '',
    partner_count: '0',
    visit_date: todayIso(),
    amount_cup: DEFAULT_COLLECTION_CUP,
    payment_method: 'cash',
    payment_reference: '',
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { results: autocompleteResults, loading: autocompleteLoading, search: autocompleteSearch } = useVisitorAutocomplete()
  const { registerWalkIn } = useRegisterWalkIn()

  // One key per submission attempt: a retry or double click reuses it, so the
  // server returns the original visit instead of charging again.
  const idempotencyKeyRef = useRef<string | null>(null)

  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [selectedUser, setSelectedUser] = useState<VisitorAutocompleteResult | null>(null)

  const handleCiChange = (ci: string) => {
    const cleaned = ci.replace(/\D/g, '').slice(0, 11)
    setValues({ ...values, ci: cleaned })
    setSelectedUser(null)
    setShowAutocomplete(cleaned.length >= 3)
    void autocompleteSearch(cleaned)
  }

  const handleSelectUser = (user: VisitorAutocompleteResult) => {
    setSelectedUser(user)
    setValues({
      ...values,
      ci: user.ci,
      name: user.name,
      phone: user.phone ?? '',
    })
    setShowAutocomplete(false)
  }

  const handleChange = (field: keyof WalkInFormValues, value: string) => {
    setValues({ ...values, [field]: value })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitError(null)
    setSubmitted(false)

    // Validate
    if (values.ci.length !== 11 || !/^\d+$/.test(values.ci)) {
      setSubmitError('El CI debe tener exactamente 11 dígitos')
      return
    }
    if (!values.name.trim()) {
      setSubmitError('El nombre es obligatorio')
      return
    }
    const partnerCount = Number(values.partner_count)
    if (!Number.isInteger(partnerCount) || partnerCount < 0 || partnerCount > 50) {
      setSubmitError('El número de acompañantes debe estar entre 0 y 50')
      return
    }
    if (!values.visit_date) {
      setSubmitError('La fecha de visita es obligatoria')
      return
    }
    const amount = Number(values.amount_cup)
    if (!Number.isInteger(amount) || amount < 0 || amount > 100000) {
      setSubmitError('El monto cobrado debe ser un número entero en CUP (0 a 100 000)')
      return
    }

    setIsSubmitting(true)
    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      }

      await registerWalkIn(
        {
          ci: values.ci,
          name: values.name.trim(),
          phone: values.phone.trim() || null,
          partner_count: partnerCount,
          visit_date: values.visit_date,
          payment: {
            amount_cup: amount,
            payment_method: values.payment_method,
            payment_reference: values.payment_reference.trim() || null,
          },
        },
        idempotencyKeyRef.current
      )
      idempotencyKeyRef.current = null
      toast.success(`Visitante registrado: ${values.name.trim()}`)
      setSubmitted(true)
      // Reset form
      setValues({
        ci: '',
        name: '',
        phone: '',
        partner_count: '0',
        visit_date: todayIso(),
        amount_cup: DEFAULT_COLLECTION_CUP,
        payment_method: 'cash',
        payment_reference: '',
      })
      setSelectedUser(null)
    } catch (error) {
      setSubmitError(describeApiError(error, 'No se pudo registrar al visitante'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {submitError ? <FormAlert>{submitError}</FormAlert> : null}

        <FormField label="Carnet de identidad" htmlFor="walkin-ci" hint="11 dígitos">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="walkin-ci"
              inputMode="numeric"
              maxLength={11}
              autoComplete="off"
              placeholder="85010112345"
              className="h-12 pl-11 font-mono tracking-wider"
              value={values.ci}
              onChange={(event) => handleCiChange(event.target.value)}
              disabled={isSubmitting}
              required
            />
            {autocompleteLoading ? (
              <Loader2 className="absolute right-3 top-1/2 size-4 animate-spin text-muted-foreground" aria-hidden />
            ) : null}
            {showAutocomplete && autocompleteResults.length > 0 ? (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                {autocompleteResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="block w-full px-4 py-3 text-left hover:bg-muted transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">CI {user.ci}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </FormField>

        <FormField label="Nombre completo" htmlFor="walkin-name">
          <Input
            id="walkin-name"
            autoComplete="off"
            placeholder="María Pérez López"
            className="h-12"
            value={values.name}
            onChange={(event) => handleChange('name', event.target.value)}
            disabled={isSubmitting}
            required
          />
        </FormField>

        <FormField label="Teléfono" htmlFor="walkin-phone" hint="Opcional">
          <Input
            id="walkin-phone"
            type="tel"
            autoComplete="off"
            placeholder="+53 5555 5555"
            className="h-12"
            value={values.phone}
            onChange={(event) => handleChange('phone', event.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Acompañantes" htmlFor="walkin-partners" hint="0 a 50">
            <Input
              id="walkin-partners"
              type="number"
              min={0}
              max={50}
              className="h-12"
              value={values.partner_count}
              onChange={(event) => {
                const next = event.target.value
                setValues((current) => ({
                  ...current,
                  partner_count: next,
                  // Suggested collection: 1500 CUP per person (editable below).
                  amount_cup: String(1500 * (Number(next) + 1)),
                }))
              }}
              disabled={isSubmitting}
              required
            />
          </FormField>

          <FormField label="Fecha de visita" htmlFor="walkin-date">
            <Input
              id="walkin-date"
              type="date"
              className="h-12"
              value={values.visit_date}
              onChange={(event) => handleChange('visit_date', event.target.value)}
              disabled={isSubmitting}
              required
            />
          </FormField>
        </div>

        <fieldset className="space-y-5 rounded-2xl border border-border bg-muted/30 p-5">
          <legend className="px-1 text-sm font-semibold text-foreground">
            Cobro en recepción
          </legend>
          <p className="text-xs leading-relaxed text-muted-foreground">
            El cobro se hace aquí, fuera de la aplicación. Esta información es la que verá el administrador en “Cobros externos”.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Monto cobrado (CUP)" htmlFor="walkin-amount" hint="Tarifa sugerida: 1500">
              <Input
                id="walkin-amount"
                type="number"
                inputMode="numeric"
                min={0}
                max={100000}
                className="h-12"
                value={values.amount_cup}
                onChange={(event) => handleChange('amount_cup', event.target.value)}
                disabled={isSubmitting}
                required
              />
            </FormField>

            <FormField label="Método de cobro" htmlFor="walkin-method">
              <Select
                value={values.payment_method}
                onValueChange={(value) => handleChange('payment_method', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="walkin-method" className="h-12" aria-label="Método de cobro">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Referencia" htmlFor="walkin-reference" hint="Opcional: recibo o nota">
            <Input
              id="walkin-reference"
              autoComplete="off"
              maxLength={100}
              className="h-12"
              value={values.payment_reference}
              onChange={(event) => handleChange('payment_reference', event.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
        </fieldset>

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

      <aside aria-labelledby="walkin-info">
        <h2
          id="walkin-info"
          className="font-display text-lg font-semibold tracking-tight text-foreground"
        >
          {submitted ? 'Visitante registrado' : 'Sobre este registro'}
        </h2>

        {submitted ? (
          <div className="mt-4 space-y-3">
            <div
              role="status"
              className="rounded-2xl border border-primary/20 bg-primary/5 p-5"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Entrada registrada
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {values.name} · CI {values.ci}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {values.partner_count} {values.partner_count === '1' ? 'acompañante' : 'acompañantes'}
                  </p>
                  <span className="mt-3 inline-flex rounded-full border border-primary/30 bg-transparent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Walk-in
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              El visitante y sus acompañantes han sido registrados en el aforo del día.
            </p>
          </div>
        ) : (
          <div className={cn(
            "mt-4 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground shadow-sm",
            selectedUser && "border-primary/30"
          )}>
            {selectedUser ? (
              <>
                <p className="font-semibold text-foreground">
                  Usuario encontrado
                </p>
                <p className="mt-2">
                  Se reutilizará el registro existente de <strong>{selectedUser.name}</strong>.
                </p>
              </>
            ) : (
              <>
                <p>
                  Registra visitantes que llegan sin cita previa. Si el CI ya existe en el sistema,
                  se reutilizará automáticamente.
                </p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5">
                  <li>La entrada se registra de inmediato.</li>
                  <li>Los acompañantes cuentan para el aforo del día.</li>
                  <li>No requieren suscripción corporativa.</li>
                </ul>
              </>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}
