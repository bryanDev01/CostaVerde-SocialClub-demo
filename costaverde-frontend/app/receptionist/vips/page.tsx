'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Search, Star, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/Common/EmptyState'
import { FormAlert } from '@/components/Common/FormAlert'
import { FormField } from '@/components/Common/FormField'
import {
  useDebouncedValue,
  useReceptionToday,
  useReceptionVipEntry,
  useReceptionVipSearch,
} from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import type { VipUser } from '@/lib/types'
import type { VisitPaymentMethod } from '@/lib/hooks'
import { cn } from '@/lib/utils'

export default function ReceptionVipsPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VipUser[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [enteringId, setEnteringId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<VisitPaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const { searchVips } = useReceptionVipSearch()
  const { registerVipEntry } = useReceptionVipEntry()
  const { today: receptionToday, refetch: refetchToday } = useReceptionToday()
  const debouncedQuery = useDebouncedValue(query, 300)

  // Live search while typing: reception may not know the exact name.
  useEffect(() => {
    const value = debouncedQuery.trim()
    if (value.length < 2) {
      setResults([])
      setSearched(false)
      setSearching(false)
      return
    }

    let active = true
    setSearching(true)
    searchVips(value)
      .then((rows) => {
        if (!active) return
        setResults(rows)
        setSearched(true)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(describeApiError(err, 'No se pudo buscar VIP'))
      })
      .finally(() => {
        if (active) setSearching(false)
      })

    return () => {
      active = false
    }
  }, [debouncedQuery, searchVips])

  const handleEntry = async (vip: VipUser) => {
    setError(null)
    const amountCup = Number(amount)
    if (!Number.isInteger(amountCup) || amountCup < 0 || amountCup > 100000) {
      setError('El monto debe ser un número entero en CUP (0 a 100 000)')
      return
    }
    setEnteringId(vip.id)
    try {
      await registerVipEntry(vip.id, {
        amount_cup: amountCup,
        payment_method: method,
        payment_reference: method === 'transfer' ? reference.trim() || null : null,
      })
      toast.success(`Entrada registrada: ${vip.name}`)
      setAmount('')
      setReference('')
      void refetchToday()
    } catch (err) {
      setError(describeApiError(err, 'No se pudo registrar la entrada'))
    } finally {
      setEnteringId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Recepción
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Verificar VIP
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Busca al VIP por nombre o carnet, confirma que coincide con lo
          registrado por administración y registra su entrada del día.
        </p>
      </header>

      <div className="mt-8 max-w-md">
        <div className="relative w-full">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Escribe el nombre o el CI del VIP..."
            className="h-12 pl-11 pr-11"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar VIP"
            autoComplete="off"
          />
          {searching ? (
            <Loader2
              className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden
            />
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Los resultados aparecen mientras escribes. Basta con parte del nombre o
          el carnet.
        </p>
      </div>

      {error ? (
        <div className="mt-6">
          <FormAlert>{error}</FormAlert>
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Cobro de la entrada
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          El VIP paga la misma entrada que un asociado. Escribe el monto antes de
          registrar.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Monto (CUP)" htmlFor="vip-amount">
            <Input
              id="vip-amount"
              type="number"
              min={0}
              max={100000}
              placeholder="Escribe el monto"
              className="h-12"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </FormField>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Método
            </p>
            <div className="mt-2 flex gap-2" role="group" aria-label="Método de pago">
              {([
                { value: 'cash' as VisitPaymentMethod, label: 'Efectivo' },
                { value: 'transfer' as VisitPaymentMethod, label: 'Transferencia' },
              ]).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMethod(option.value)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50',
                    method === option.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {method === 'transfer' ? (
          <div className="mt-4">
            <FormField label="Referencia" htmlFor="vip-reference" hint="Opcional">
              <Input
                id="vip-reference"
                className="h-12"
                maxLength={100}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
            </FormField>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {searching ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Buscando...
          </div>
        ) : searched && results.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Sin coincidencias"
            description="No encontramos un VIP activo con ese nombre o carnet."
          />
        ) : (
          <div className="space-y-3">
            {results.map((vip) => (
              <div
                key={vip.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold tracking-tight text-foreground">
                    {vip.name}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    CI {vip.ci}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="size-3.5" aria-hidden />
                    {vip.partners_count}{' '}
                    {vip.partners_count === 1 ? 'acompañante' : 'acompañantes'}
                  </p>
                </div>
                <Button
                  className="h-11"
                  disabled={enteringId !== null}
                  onClick={() => void handleEntry(vip)}
                >
                  {enteringId === vip.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <CheckCircle2 className="size-4" aria-hidden />
                  )}
                  Registrar entrada
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {receptionToday && receptionToday.visits.length > 0 ? (
        <section aria-labelledby="visitas-hoy" className="mt-10">
          <h2
            id="visitas-hoy"
            className="font-display text-xl font-semibold tracking-tight text-foreground"
          >
            Entradas registradas hoy
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aforo de visitas: {receptionToday.visits_aforo} personas ·{' '}
            {receptionToday.reservations_aforo} por reservas
          </p>
          <ul className="mt-4 space-y-2">
            {receptionToday.visits.map((visit) => (
              <li
                key={visit.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {visit.responsible_name}
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">
                      {visit.kind === 'vip'
                        ? 'VIP'
                        : visit.kind === 'associate'
                          ? 'Asociado'
                          : 'Externo'}
                    </span>
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {visit.responsible_ci ? `CI ${visit.responsible_ci} · ` : ''}
                    {visit.partner_count}{' '}
                    {visit.partner_count === 1 ? 'acompañante' : 'acompañantes'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block text-sm font-semibold text-foreground">
                    {visit.headcount} {visit.headcount === 1 ? 'persona' : 'personas'}
                  </span>
                  {visit.amount_cup !== null ? (
                    <span className="block text-xs text-muted-foreground">
                      {visit.amount_cup} CUP ·{' '}
                      {visit.payment_method === 'transfer' ? 'Transferencia' : 'Efectivo'}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
