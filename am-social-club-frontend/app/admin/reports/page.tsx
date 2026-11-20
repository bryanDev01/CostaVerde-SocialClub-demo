'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  BarChart3,
  CalendarDays,
  Coins,
  FileBarChart2,
  MapPin,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react'
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
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { ReportExports } from '@/components/Common/ReportExports'
import { HorizontalBarChart, type BarChartItem } from '@/components/Admin/ReportCharts'
import { useAdminOccupancy, useAdminPaymentsByDay, useAdminRevenue } from '@/lib/hooks'
import { formatShortDate, formatDate, todayInputValue, toDateInputValue } from '@/lib/dates'
import { cn } from '@/lib/utils'

type RangePreset = 'today' | 'week' | 'month' | 'custom'

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Últimos 7 días' },
  { value: 'month', label: 'Este mes' },
  { value: 'custom', label: 'Personalizado' },
]

function getPresetRange(preset: Exclude<RangePreset, 'custom'>): {
  start: string
  end: string
} {
  const today = new Date()
  const end = toDateInputValue(today)

  if (preset === 'today') {
    return { start: end, end }
  }

  if (preset === 'week') {
    const start = new Date(today)
    start.setDate(start.getDate() - 6)
    return { start: toDateInputValue(start), end }
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  return { start: toDateInputValue(start), end }
}

export default function AdminReportsPage() {
  const [preset, setPreset] = useState<RangePreset>('week')
  const initialRange = useMemo(() => getPresetRange('week'), [])
  const [startDate, setStartDate] = useState(initialRange.start)
  const [endDate, setEndDate] = useState(initialRange.end)

  const handlePresetChange = (nextPreset: RangePreset) => {
    setPreset(nextPreset)
    if (nextPreset !== 'custom') {
      const range = getPresetRange(nextPreset)
      setStartDate(range.start)
      setEndDate(range.end)
    }
  }

  const {
    rows: occupancyRows,
    loading: occupancyLoading,
    error: occupancyError,
    refetch: refetchOccupancy,
  } = useAdminOccupancy(startDate, endDate)

  const {
    report: revenueReport,
    loading: revenueLoading,
    error: revenueError,
    refetch: refetchRevenue,
  } = useAdminRevenue(startDate, endDate)

  const {
    report: paymentsReport,
    loading: paymentsLoading,
    error: paymentsError,
    refetch: refetchPayments,
  } = useAdminPaymentsByDay(startDate, endDate)

  const loading = occupancyLoading || revenueLoading || paymentsLoading
  const error = occupancyError ?? revenueError ?? paymentsError

  const refetchAll = () => {
    refetchOccupancy()
    refetchRevenue()
    refetchPayments()
  }

  const occupancyByActivity = useMemo(() => {
    const grouped = new Map<
      string,
      { name: string; reserved: number; capacity: number; count: number }
    >()

    for (const row of occupancyRows) {
      if (!row.date) continue
      const existing = grouped.get(row.activity_id)
      if (existing) {
        existing.reserved += row.total_reserved
        existing.count += row.reservation_count
      } else {
        grouped.set(row.activity_id, {
          name: row.activity_name,
          reserved: row.total_reserved,
          capacity: row.capacity,
          count: row.reservation_count,
        })
      }
    }

    return [...grouped.values()].sort((a, b) => b.reserved - a.reserved)
  }, [occupancyRows])

  const occupancyChartItems: BarChartItem[] = occupancyByActivity.map((item) => ({
    label: item.name,
    value: item.reserved,
    caption: `${item.count} ${item.count === 1 ? 'reserva' : 'reservas'} · capacidad diaria ${item.capacity}`,
  }))

  const revenuePlanItems: BarChartItem[] = (revenueReport?.by_plan ?? []).map(
    (plan) => ({
      label: plan.plan_name,
      value: plan.total_cup,
      caption: `${plan.count} ${plan.count === 1 ? 'pago' : 'pagos'} · ${plan.duration_months} ${
        plan.duration_months === 1 ? 'mes' : 'meses'
      }`,
    })
  )

  const paymentDays = (paymentsReport?.days ?? []).filter(
    (day) =>
      day.validated_count > 0 || day.pending_count > 0 || day.rejected_count > 0
  )

  const paymentsPerDayItems: BarChartItem[] = paymentDays.map((day) => ({
    label: formatShortDate(day.date),
    value: day.total_cup,
    caption: `${day.subscription_count} ${
      day.subscription_count === 1 ? 'suscripción' : 'suscripciones'
    } · ${day.per_visit_count} visitas`,
  }))

  const reportSections = [
    {
      title: 'Ocupación por actividad',
      columns: ['Actividad', 'Categoría', 'Fecha', 'Capacidad', 'Reservadas', 'Ocupación %', 'Reservas'],
      rows: occupancyRows.map((row) => [row.activity_name, row.category_name ?? '', row.date ?? '', row.capacity, row.total_reserved, row.occupancy_percent, row.reservation_count]),
    },
    {
      title: 'Ingresos por plan',
      columns: ['Plan', 'Duración (meses)', 'Pagos', 'Total CUP'],
      rows: (revenueReport?.by_plan ?? []).map((plan) => [plan.plan_name, plan.duration_months, plan.count, plan.total_cup]),
    },
    {
      title: 'Pagos por día',
      columns: ['Fecha', 'Pagadores', 'Suscripciones', 'Visitas', 'Pendientes', 'Rechazados', 'Total CUP'],
      rows: (paymentsReport?.days ?? []).map((day) => [day.date, day.payers_count, day.subscription_count, day.per_visit_count, day.pending_count, day.rejected_count, day.total_cup]),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Reportes
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Ocupación e ingresos
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Analiza la demanda por actividad y los ingresos validados en el
          período seleccionado.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/admin/reports/general"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <FileBarChart2 className="size-4" aria-hidden />
            Ver reporte general
          </Link>
          <Link
            href="/admin/reports/daily"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <CalendarDays className="size-4" aria-hidden />
            Ver resumen del día
          </Link>
          <Link
            href="/admin/reports/capacity"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <MapPin className="size-4" aria-hidden />
            Ver capacidad por local
          </Link>
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div
          className="inline-flex flex-wrap rounded-xl border border-border bg-muted/60 p-1"
          role="group"
          aria-label="Período del reporte"
        >
          {PRESETS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handlePresetChange(option.value)}
              aria-pressed={preset === option.value}
              className={cn(
                'rounded-lg px-3.5 py-2 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50',
                preset === option.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor="report-start"
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            >
              Desde
            </label>
            <Input
              id="report-start"
              type="date"
              className="h-11 w-40"
              value={startDate}
              max={endDate}
              onChange={(event) => {
                setStartDate(event.target.value)
                setPreset('custom')
              }}
            />
          </div>
          <div>
            <label
              htmlFor="report-end"
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            >
              Hasta
            </label>
            <Input
              id="report-end"
              type="date"
              className="h-11 w-40"
              value={endDate}
              min={startDate}
              max={todayInputValue()}
              onChange={(event) => {
                setEndDate(event.target.value)
                setPreset('custom')
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <ReportExports title="Ocupación e ingresos" filename={`reporte-${startDate}-${endDate}`} sections={reportSections} disabled={loading || Boolean(error)} />
      </div>

      {error ? (
        <div className="mt-10 space-y-5">
          <FormAlert>No se pudieron cargar los reportes: {error}</FormAlert>
          <Button variant="outline" className="h-11 bg-background" onClick={refetchAll}>
            <RefreshCw className="size-4" aria-hidden />
            Reintentar
          </Button>
        </div>
      ) : loading ? (
        <div className="mt-10 space-y-6">
          <div className="grid gap-5 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <SkeletonCard key={item} lines={2} />
            ))}
          </div>
          <SkeletonCard lines={4} />
        </div>
      ) : (
        <>
          <p className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Período: {formatDate(startDate)} — {formatDate(endDate)}
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Coins className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Ingresos validados
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-primary">
                ${revenueReport?.total_cup ?? 0}
                <span className="ml-1 text-base font-normal text-muted-foreground">CUP</span>
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Suscripciones pagadas
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
                {revenueReport?.subscription_count ?? 0}
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Visitas externas
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
                {revenueReport?.per_visit_count ?? 0}
              </p>
            </article>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section
              aria-labelledby="ocupacion-actividad"
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Activity className="size-5" aria-hidden />
                </span>
                <div>
                  <h2
                    id="ocupacion-actividad"
                    className="font-display text-lg font-semibold tracking-tight text-foreground"
                  >
                    Ocupación por actividad
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Plazas reservadas en el período
                  </p>
                </div>
              </div>
              <HorizontalBarChart
                className="mt-6"
                items={occupancyChartItems}
                formatValue={(value) => `${value} plazas`}
                emptyMessage="No hay reservas registradas en el período seleccionado."
              />
            </section>

            <section
              aria-labelledby="ingresos-plan"
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BarChart3 className="size-5" aria-hidden />
                </span>
                <div>
                  <h2
                    id="ingresos-plan"
                    className="font-display text-lg font-semibold tracking-tight text-foreground"
                  >
                    Ingresos por plan
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Solo pagos de suscripción validados
                  </p>
                </div>
              </div>
              <HorizontalBarChart
                className="mt-6"
                items={revenuePlanItems}
                formatValue={(value) => `$${value}`}
                emptyMessage="No hay pagos de suscripción validados en el período."
              />
            </section>
          </div>

          <section
            aria-labelledby="pagos-dia"
            className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Wallet className="size-5" aria-hidden />
                </span>
                <div>
                  <h2
                    id="pagos-dia"
                    className="font-display text-lg font-semibold tracking-tight text-foreground"
                  >
                    Pagos por día
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Pagos validados por fecha de conciliación · pendientes y
                    rechazados por fecha de registro
                  </p>
                </div>
              </div>
              {paymentsReport ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {paymentsReport.totals.validated_count}
                  </span>{' '}
                  pagos validados ·{' '}
                  <span className="font-semibold text-foreground">
                    ${paymentsReport.totals.total_cup}
                  </span>{' '}
                  CUP ·{' '}
                  <span className="font-semibold text-danger">
                    {paymentsReport.totals.pending_count}
                  </span>{' '}
                  pendientes ·{' '}
                  <span className="font-semibold text-danger">
                    {paymentsReport.totals.rejected_count}
                  </span>{' '}
                  rechazados
                </p>
              ) : null}
            </div>

            {paymentDays.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                No hay pagos registrados en el período seleccionado.
              </p>
            ) : (
              <>
                <HorizontalBarChart
                  className="mt-6"
                  items={paymentsPerDayItems}
                  formatValue={(value) => `$${value}`}
                  emptyMessage=""
                />

                <div className="mt-6 overflow-x-auto rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Día</TableHead>
                        <TableHead className="text-center">Pagadores</TableHead>
                        <TableHead className="text-center">Suscrip.</TableHead>
                        <TableHead className="hidden text-center sm:table-cell">
                          Visitas
                        </TableHead>
                        <TableHead className="hidden text-center md:table-cell">
                          Pendientes
                        </TableHead>
                        <TableHead className="hidden text-center md:table-cell">
                          Rechazados
                        </TableHead>
                        <TableHead className="text-right">Total CUP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentDays.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className="font-medium text-foreground">
                            {formatShortDate(day.date)}
                          </TableCell>
                          <TableCell className="text-center">
                            {day.payers_count}
                          </TableCell>
                          <TableCell className="text-center">
                            <p>{day.subscription_count}</p>
                            <p className="text-xs text-muted-foreground">
                              ${day.subscription_cup}
                            </p>
                          </TableCell>
                          <TableCell className="hidden text-center sm:table-cell">
                            <p>{day.per_visit_count}</p>
                            <p className="text-xs text-muted-foreground">
                              ${day.per_visit_cup}
                            </p>
                          </TableCell>
                          <TableCell className="hidden text-center md:table-cell">
                            <span
                              className={cn(
                                day.pending_count > 0 &&
                                  'font-semibold text-danger'
                              )}
                            >
                              {day.pending_count}
                            </span>
                          </TableCell>
                          <TableCell className="hidden text-center md:table-cell">
                            <span
                              className={cn(
                                day.rejected_count > 0 &&
                                  'font-semibold text-danger'
                              )}
                            >
                              {day.rejected_count}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground">
                            ${day.total_cup}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </section>

          {occupancyChartItems.length === 0 && revenuePlanItems.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                icon={BarChart3}
                title="Sin actividad en el período"
                description="Prueba con un rango de fechas más amplio para ver datos de ocupación e ingresos."
                action={
                  <Button
                    variant="outline"
                    className="h-11 bg-background"
                    onClick={() => handlePresetChange('month')}
                  >
                    Ver este mes
                  </Button>
                }
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
