'use client'

import { useState } from 'react'
import { RefreshCw, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/Common/EmptyState'
import { FormAlert } from '@/components/Common/FormAlert'
import { FormField } from '@/components/Common/FormField'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import {
  useAdminExternalPayments,
  type ExternalPaymentTotalsBucket,
  type VisitKind,
  type VisitPaymentMethod,
} from '@/lib/hooks'
import { formatDate } from '@/lib/dates'

const METHOD_LABELS: Record<VisitPaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  other: 'Otro',
}

const KIND_LABELS: Record<VisitKind, string> = {
  walk_in: 'Externo',
  vip: 'VIP',
  associate: 'Asociado',
}

const todayIso = (): string => new Date().toISOString().split('T')[0]
const firstOfMonthIso = (): string => `${todayIso().slice(0, 8)}01`

/** Cost per person in CUP (amount divided by people), rounded to whole pesos. */
const perPerson = (amount: number, people: number): number | null =>
  people > 0 ? Math.round(amount / people) : null

const formatCup = (value: number): string => `$${value.toLocaleString('es-CU')} CUP`

export default function AdminExternalPaymentsPage() {
  const [from, setFrom] = useState(firstOfMonthIso)
  const [to, setTo] = useState(todayIso)
  const { report, loading, error, refetch } = useAdminExternalPayments(from, to)

  const invalidRange = from > to

  const totals = report?.totals
  const averagePerPerson = totals ? perPerson(totals.amount_cup, totals.people) : null

  // by_kind is missing when the API server is older than this page (stale process/build).
  const byKind = report?.by_kind ?? null

  const typeRows: { label: string; bucket: ExternalPaymentTotalsBucket; strong?: boolean }[] =
    report && byKind
      ? [
          { label: KIND_LABELS.walk_in, bucket: byKind.walk_in },
          { label: KIND_LABELS.vip, bucket: byKind.vip },
          { label: KIND_LABELS.associate, bucket: byKind.associate },
          { label: 'Total', bucket: report.totals, strong: true },
        ]
      : []

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Pagos
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Cobros de recepción
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Cobros registrados en recepción: externos, asociados y VIP. Los
          externos pagan por persona; asociados y VIP pagan la entrada del día
          que la recepcionista registra manualmente.
        </p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <FormField label="Desde" htmlFor="ext-from">
          <Input
            id="ext-from"
            type="date"
            className="h-12"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </FormField>
        <FormField label="Hasta" htmlFor="ext-to">
          <Input
            id="ext-to"
            type="date"
            className="h-12"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </FormField>
        <Button
          variant="outline"
          className="h-12 bg-background"
          onClick={() => {
            setFrom(firstOfMonthIso())
            setTo(todayIso())
          }}
        >
          Este mes
        </Button>
      </div>

      {invalidRange ? (
        <div className="mt-4">
          <FormAlert>La fecha “Desde” debe ser anterior o igual a “Hasta”.</FormAlert>
        </div>
      ) : null}

      <div className="mt-8">
        {loading ? (
          <div className="space-y-4">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={3} />
          </div>
        ) : error ? (
          <div className="space-y-5">
            <FormAlert>No se pudieron cargar los cobros: {error}</FormAlert>
            <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
              <RefreshCw className="size-4" aria-hidden />
              Reintentar
            </Button>
          </div>
        ) : report && totals ? (
          <>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Total cobrado
                </dt>
                <dd className="mt-2 font-display text-3xl font-semibold text-primary">
                  {formatCup(totals.amount_cup)}
                </dd>
                <p className="mt-1 text-xs text-muted-foreground">Suma de todos los cobros del período</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Grupos cobrados
                </dt>
                <dd className="mt-2 font-display text-3xl font-semibold text-foreground">
                  {totals.visits}
                </dd>
                <p className="mt-1 text-xs text-muted-foreground">Un cobro = un grupo</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Personas cubiertas
                </dt>
                <dd className="mt-2 font-display text-3xl font-semibold text-foreground">
                  {totals.people}
                </dd>
                <p className="mt-1 text-xs text-muted-foreground">Líder + acompañantes de cada grupo</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Promedio por persona
                </dt>
                <dd className="mt-2 font-display text-3xl font-semibold text-foreground">
                  {averagePerPerson === null ? '—' : formatCup(averagePerPerson)}
                </dd>
                <p className="mt-1 text-xs text-muted-foreground">Monto ÷ personas</p>
              </div>
            </dl>

            {byKind && report.items.length > 0 ? (
            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Resumen por tipo de visitante
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Externo: visitantes que llegan sin reserva. Asociado: socios de
                empresa con entrada pagada en recepción. VIP: invitados
                registrados por administración.
              </p>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Grupos</TableHead>
                      <TableHead className="text-center">Personas</TableHead>
                      <TableHead className="text-right">Monto cobrado</TableHead>
                      <TableHead className="text-right">Por persona</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typeRows.map((row) => {
                      const perHead = perPerson(row.bucket.amount_cup, row.bucket.people)
                      return (
                        <TableRow key={row.label} className={row.strong ? 'bg-muted/40 font-semibold' : undefined}>
                          <TableCell className={row.strong ? 'font-semibold' : 'font-medium'}>{row.label}</TableCell>
                          <TableCell className="text-center">{row.bucket.visits}</TableCell>
                          <TableCell className="text-center">{row.bucket.people}</TableCell>
                          <TableCell className="text-right">{formatCup(row.bucket.amount_cup)}</TableCell>
                          <TableCell className="text-right">
                            {perHead === null ? '—' : formatCup(perHead)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </section>
            ) : null}

            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Detalle de cobros
              </h2>
              <div className="mt-4">
                {report.items.length === 0 ? (
                  <EmptyState
                    icon={Wallet}
                    title="Sin cobros en este período"
                    description="Cuando recepción registre un cobro de un externo, asociado o VIP, aparecerá aquí."
                  />
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Líder del grupo</TableHead>
                          <TableHead className="text-center">Personas</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead className="text-right">Por persona</TableHead>
                          <TableHead className="hidden md:table-cell">Método</TableHead>
                          <TableHead className="hidden lg:table-cell">Referencia</TableHead>
                          <TableHead className="hidden md:table-cell">Registró</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.items.map((item) => {
                          const people = item.partner_count + 1
                          const perHead = perPerson(item.amount_cup, people)
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="text-sm">{formatDate(item.visit_date)}</TableCell>
                              <TableCell className="text-sm">
                                <span className="inline-flex rounded-md border border-border px-2 py-0.5 text-xs font-semibold text-foreground">
                                  {KIND_LABELS[item.kind]}
                                </span>
                              </TableCell>
                              <TableCell>
                                <p className="font-medium text-foreground">{item.responsible_name}</p>
                                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                  CI {item.responsible_ci ?? '—'}
                                </p>
                              </TableCell>
                              <TableCell className="text-center font-semibold">{people}</TableCell>
                              <TableCell className="text-right font-semibold text-foreground">
                                {formatCup(item.amount_cup)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {perHead === null ? '—' : formatCup(perHead)}
                              </TableCell>
                              <TableCell className="hidden text-sm md:table-cell">
                                {METHOD_LABELS[item.payment_method]}
                              </TableCell>
                              <TableCell className="hidden font-mono text-xs lg:table-cell">
                                {item.payment_reference ?? '—'}
                              </TableCell>
                              <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                                {item.registered_by_name ?? '—'}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
