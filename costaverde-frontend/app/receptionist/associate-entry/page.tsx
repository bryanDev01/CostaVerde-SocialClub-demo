'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Search, Ticket, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormAlert } from '@/components/Common/FormAlert'
import { FormField } from '@/components/Common/FormField'
import { EmptyState } from '@/components/Common/EmptyState'
import {
  useAssociateEntry,
  useDebouncedValue,
  useReceptionMemberSearch,
  type MemberSearchResult,
  type VisitPaymentMethod,
} from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import { cn } from '@/lib/utils'

const METHOD_OPTIONS: { value: VisitPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
]

export default function AssociateEntryPage() {
  const { searchMembers } = useReceptionMemberSearch()
  const { registerEntry } = useAssociateEntry()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MemberSearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<MemberSearchResult | null>(null)
  const [people, setPeople] = useState('1')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<VisitPaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const debouncedQuery = useDebouncedValue(query, 300)

  // Live search while typing: reception may not know the exact name.
  useEffect(() => {
    const value = debouncedQuery.trim()
    if (value.length < 2 || selected) {
      if (!selected) {
        setResults([])
        setSearched(false)
      }
      setSearching(false)
      return
    }

    let active = true
    setSearching(true)
    searchMembers(value)
      .then((rows) => {
        if (!active) return
        setResults(rows)
        setSearched(true)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(describeApiError(err, 'No se pudo buscar el asociado'))
      })
      .finally(() => {
        if (active) setSearching(false)
      })

    return () => {
      active = false
    }
  }, [debouncedQuery, selected, searchMembers])

  const selectMember = (member: MemberSearchResult) => {
    setSelected(member)
    setResults([])
    setSearched(false)
    setQuery('')
    setPeople(String(member.associates_count + 1))
    setAmount('')
    setMethod('cash')
    setReference('')
    setError(null)
    setDone(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected) return
    setError(null)
    setDone(null)

    const peopleCount = Number(people)
    if (!Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 51) {
      setError('La cantidad de personas debe estar entre 1 y 51')
      return
    }
    const amountCup = Number(amount)
    if (!Number.isInteger(amountCup) || amountCup < 0 || amountCup > 100000) {
      setError('El monto debe ser un número entero en CUP (0 a 100 000)')
      return
    }

    setSubmitting(true)
    try {
      await registerEntry(selected.id, {
        people: peopleCount,
        payment: {
          amount_cup: amountCup,
          payment_method: method,
          payment_reference: method === 'transfer' ? reference.trim() || null : null,
        },
      })
      setDone(
        `Entrada registrada: ${selected.name} · ${peopleCount} ${
          peopleCount === 1 ? 'persona' : 'personas'
        } · ${amountCup} CUP`
      )
      toast.success('Entrada registrada')
      setSelected(null)
      setQuery('')
      setAmount('')
      setReference('')
    } catch (err) {
      setError(describeApiError(err, 'No se pudo registrar la entrada'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Recepción
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Entrada de asociado
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Busca al asociado por carnet o nombre, confirma cuántas personas entran
          y registra el cobro de la entrada del día. El titular paga por su grupo.
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
            placeholder="Escribe el CI o parte del nombre..."
            className="h-12 pl-11 pr-11"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              if (selected) setSelected(null)
            }}
            aria-label="Buscar asociado"
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

      {error ? <div className="mt-6"><FormAlert>{error}</FormAlert></div> : null}
      {done ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm text-foreground">{done}</p>
        </div>
      ) : null}

      {!selected && results.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {results.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => selectMember(member)}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold tracking-tight text-foreground">
                    {member.name}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    CI {member.ci} · {member.company_name ?? 'Sin empresa'}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" aria-hidden />
                  {member.associates_count} acompañantes
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!selected && searched && !searching && results.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Search}
            title="Sin coincidencias"
            description="No encontramos un asociado activo con ese CI o nombre."
          />
        </div>
      ) : null}

      {selected ? (
        <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-xl font-semibold text-foreground">
                {selected.name}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                CI {selected.ci} · {selected.company_name ?? 'Sin empresa'}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-9 text-muted-foreground"
              onClick={() => setSelected(null)}
            >
              Cambiar asociado
            </Button>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <FormField label="Personas" htmlFor="entry-people" hint={`Titular + acompañantes (${selected.associates_count} registrados)`}>
              <Input
                id="entry-people"
                type="number"
                min={1}
                max={51}
                className="h-12"
                value={people}
                onChange={(event) => setPeople(event.target.value)}
                disabled={submitting}
              />
            </FormField>

            <FormField label="Monto cobrado (CUP)" htmlFor="entry-amount">
              <Input
                id="entry-amount"
                type="number"
                min={0}
                max={100000}
                placeholder="Escribe el monto"
                className="h-12"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={submitting}
              />
            </FormField>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Método de pago
            </p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Método de pago">
              {METHOD_OPTIONS.map((option) => (
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

          {method === 'transfer' ? (
            <div className="mt-5">
              <FormField label="Referencia de la transferencia" htmlFor="entry-reference" hint="Opcional">
                <Input
                  id="entry-reference"
                  className="h-12"
                  maxLength={100}
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  disabled={submitting}
                />
              </FormField>
            </div>
          ) : null}

          <Button type="submit" className="mt-6 h-12 w-full text-[15px] font-semibold" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Registrando entrada...
              </>
            ) : (
              <>
                <Ticket className="size-4" aria-hidden />
                Registrar entrada y cobro
              </>
            )}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
