'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  MapPin,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
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
import { useAdminCapacity } from '@/lib/hooks'
import { formatDate, todayInputValue, toDateInputValue } from '@/lib/dates'
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

export default function AdminCapacityReportPage() {
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

  const { report, loading, error, refetch } = useAdminCapacity(startDate, endDate)

  const capacityLocations = (report?.locations ?? []).filter(
    (location) => location.period_capacity > 0
  )

  const occupancyChartItems: BarChartItem[] = capacityLocations.map((location) => ({
    label: location.location,
    value: location.occupancy_percent,
    caption: `${location.total_reserved} de ${location.period_capacity} plazas-día`,
  }))
  const reportSections = [
    {
      title: 'Resumen de capacidad',
      columns: ['Indicador', 'Valor'],
      rows: report ? [
        ['Período', `${report.period_start} - ${report.period_end}`],
        ['Días', report.period_days],
        ['Capacidad del período', report.summary.total_period_capacity],
        ['Plazas reservadas', report.summary.total_reserved],
        ['Ocupación global %', report.summary.overall_occupancy_percent],
        ['Local más utilizado', report.summary.most_used ?? '—'],
        ['Local menos utilizado', report.summary.least_used ?? '—'],
      ] : [],
    },
    {
      title: 'Detalle por local',
      columns: ['Local', 'Actividades', 'Capacidad diaria', 'Capacidad período', 'Reservas', 'Disponibles', 'Ocupación %', 'Eventos', 'Invitados'],
      rows: (report?.locations ?? []).map((location) => [location.location, location.activity_count, location.daily_capacity, location.period_capacity, location.total_reserved, location.available, location.occupancy_percent, location.event_bookings, location.event_guests]),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Volver a reportes
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Capacidad
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Ocupación por local
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Comparativa de uso de cada local en el período: plazas disponibles,
          reservas consumidas y ranking de los más y menos utilizados.
        </p>
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
              htmlFor="capacity-start"
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            >
              Desde
            </label>
            <Input
              id="capacity-start"
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
              htmlFor="capacity-end"
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            >
              Hasta
            </label>
            <Input
              id="capacity-end"
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
        <ReportExports title="Ocupación por local" filename={`reporte-capacidad-${startDate}-${endDate}`} sections={reportSections} disabled={loading || Boolean(error)} />
      </div>

      {error ? (
        <div className="mt-10 space-y-5">
          <FormAlert>No se pudo cargar el reporte de capacidad: {error}</FormAlert>
          <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
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
      ) : report ? (
        <>
          <p className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Período: {formatDate(report.period_start)} — {formatDate(report.period_end)} ·{' '}
            {report.period_days} {report.period_days === 1 ? 'día' : 'días'}
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Ocupación global
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-primary">
                {report.summary.overall_occupancy_percent}
                <span className="text-base font-normal text-muted-foreground">%</span>
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {report.summary.total_reserved} de{' '}
                {report.summary.total_period_capacity} plazas-día consumidas
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <ThumbsUp className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Local más utilizado
              </p>
              <p className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground">
                {report.summary.most_used ?? '—'}
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-danger/10 text-danger">
                <ThumbsDown className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Local menos utilizado
              </p>
              <p className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground">
                {report.summary.least_used ?? '—'}
              </p>
            </article>
          </div>

          {capacityLocations.length === 0 ? (
            <div className="mt-10">
              <EmptyState
                icon={MapPin}
                title="Sin datos de capacidad"
                description="No hay actividades activas con localización configurada o no hay reservas en el período seleccionado."
              />
            </div>
          ) : (
            <>
              <section
                aria-labelledby="ranking-locales"
                className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <h2
                  id="ranking-locales"
                  className="font-display text-lg font-semibold tracking-tight text-foreground"
                >
                  Ranking de ocupación por local
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Porcentaje de plazas-día consumidas en el período
                </p>
                <HorizontalBarChart
                  className="mt-6"
                  items={occupancyChartItems}
                  formatValue={(value) => `${value}%`}
                  emptyMessage=""
                />
              </section>

              <section aria-labelledby="detalle-locales" className="mt-8">
                <h2
                  id="detalle-locales"
                  className="font-display text-xl font-semibold tracking-tight text-foreground"
                >
                  Detalle por local
                </h2>
                <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Local</TableHead>
                        <TableHead className="text-center">Actividades</TableHead>
                        <TableHead className="hidden text-center sm:table-cell">
                          Capacidad/día
                        </TableHead>
                        <TableHead className="hidden text-center md:table-cell">
                          Plazas del período
                        </TableHead>
                        <TableHead className="text-center">Reservas</TableHead>
                        <TableHead className="text-center">Ocupación</TableHead>
                        <TableHead className="hidden text-center lg:table-cell">
                          Disponibles
                        </TableHead>
                        <TableHead className="hidden text-center xl:table-cell">
                          Eventos
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.locations.map((location) => (
                        <TableRow key={location.location}>
                          <TableCell className="font-medium text-foreground">
                            {location.location}
                          </TableCell>
                          <TableCell className="text-center">
                            {location.activity_count}
                          </TableCell>
                          <TableCell className="hidden text-center sm:table-cell">
                            {location.daily_capacity}
                          </TableCell>
                          <TableCell className="hidden text-center md:table-cell">
                            {location.period_capacity}
                          </TableCell>
                          <TableCell className="text-center">
                            {location.total_reserved}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                'inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                                location.occupancy_percent >= 80
                                  ? 'border-danger/30 bg-danger/5 text-danger'
                                  : 'border-primary/30 bg-primary/5 text-primary'
                              )}
                            >
                              {location.occupancy_percent}%
                            </span>
                          </TableCell>
                          <TableCell className="hidden text-center text-muted-foreground lg:table-cell">
                            {location.available}
                          </TableCell>
                          <TableCell className="hidden text-center xl:table-cell">
                            <p>{location.event_bookings}</p>
                            <p className="text-xs text-muted-foreground">
                              {location.event_guests} invitados
                            </p>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </>
          )}
        </>
      ) : null}
    </div>
  )
}
