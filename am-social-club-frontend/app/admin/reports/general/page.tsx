'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  ClipboardList,
  Coins,
  Gauge,
  RefreshCw,
  Sparkles,
  Trophy,
  UserPlus,
  UserX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/Common/EmptyState'
import { FormAlert } from '@/components/Common/FormAlert'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { ReportExports } from '@/components/Common/ReportExports'
import { HorizontalBarChart, type BarChartItem } from '@/components/Admin/ReportCharts'
import {
  DateRangeSelector,
  getPresetRange,
  type RangePreset,
} from '@/components/Admin/DateRangeSelector'
import { useAdminGeneralReport } from '@/lib/hooks'
import { GRACE_PERIOD_DAYS } from '@/lib/constants'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

function StatCard({
  icon: Icon,
  label,
  value,
  caption,
  tone = 'default',
}: {
  icon: typeof Coins
  label: string
  value: string
  caption?: string
  tone?: 'default' | 'primary' | 'danger'
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <span
        className={cn(
          'grid size-10 place-items-center rounded-xl',
          tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-2 font-display text-3xl font-semibold tracking-tight',
          tone === 'danger' ? 'text-danger' : tone === 'primary' ? 'text-primary' : 'text-foreground'
        )}
      >
        {value}
      </p>
      {caption ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{caption}</p>
      ) : null}
    </article>
  )
}

export default function AdminGeneralReportPage() {
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

  const { report, loading, error, refetch } = useAdminGeneralReport(startDate, endDate)

  const topActivityItems: BarChartItem[] = (report?.top_activities ?? []).map(
    (activity) => ({
      label: activity.activity_name,
      value: activity.total_reserved,
      caption: `${activity.reservation_count} ${
        activity.reservation_count === 1 ? 'reserva' : 'reservas'
      }`,
    })
  )

  const topCompanyItems: BarChartItem[] = (report?.top_companies ?? []).map(
    (company) => ({
      label: company.company_name,
      value: company.total_reserved,
      caption: `${company.active_members} ${
        company.active_members === 1 ? 'miembro activo' : 'miembros activos'
      }`,
    })
  )

  const reportSections = [
    {
      title: 'Resumen financiero',
      columns: ['Indicador', 'Valor'],
      rows: report ? [
        ['Ingresos validados CUP', report.financial.payments.total_cup],
        ['Suscripciones pagadas', report.financial.payments.subscription_count],
        ['Reservas de eventos', report.financial.events.total_bookings],
        ['Contratos de eventos CUP', report.financial.events.contract_value_cup],
      ] : [],
    },
    {
      title: 'Nuevos usuarios y activación',
      columns: ['Indicador', 'Valor'],
      rows: report ? [
        ['Usuarios nuevos', report.users.new_total],
        ['Nuevos corporativos', report.users.new_corporate],
        ['Nuevos externos', report.users.new_external],
        ['Usuarios suspendidos', report.users.currently_suspended],
        ['Pagos pendientes', report.users.pending_payments],
        ['Empleados cargados por RRHH', report.precarga.total],
        ['Empleados activados', report.precarga.activated],
        ['Empleados sin activar', report.precarga.pending],
        ['Empleados rechazados', report.precarga.rejected],
        ['Porcentaje de activación', report.precarga.conversion_percent],
      ] : [],
    },
    {
      title: 'Operación',
      columns: ['Indicador', 'Valor'],
      rows: report ? [
        ['Reservas', report.reservations.total],
        ['Completadas', report.reservations.completed],
        ['Canceladas', report.reservations.cancelled],
        ['No asistencias', report.reservations.no_show],
        ['Ocupación global %', report.capacity.overall_occupancy_percent],
        ['Plazas reservadas', report.capacity.total_reserved],
        ['Capacidad del período', report.capacity.total_period_capacity],
      ] : [],
    },
    {
      title: 'Actividades principales',
      columns: ['Actividad', 'Plazas reservadas', 'Reservas'],
      rows: (report?.top_activities ?? []).map((item) => [item.activity_name, item.total_reserved, item.reservation_count]),
    },
    {
      title: 'Empresas principales',
      columns: ['Empresa', 'Reservas', 'Miembros activos'],
      rows: (report?.top_companies ?? []).map((item) => [item.company_name, item.total_reserved, item.active_members]),
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
          Reporte general
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Resumen ejecutivo
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Visión integral del período: ingresos, crecimiento de usuarios,
          activación de empleados, asistencia, ocupación y rankings de uso.
        </p>
      </header>

      <DateRangeSelector
        preset={preset}
        startDate={startDate}
        endDate={endDate}
        onPresetChange={handlePresetChange}
        onStartDateChange={(value) => {
          setStartDate(value)
          setPreset('custom')
        }}
        onEndDateChange={(value) => {
          setEndDate(value)
          setPreset('custom')
        }}
        startId="general-start"
        endId="general-end"
      />

      <div className="mt-5 flex justify-end">
        <ReportExports title="Resumen ejecutivo" filename={`reporte-general-${startDate}-${endDate}`} sections={reportSections} disabled={loading || Boolean(error)} />
      </div>

      {error ? (
        <div className="mt-10 space-y-5">
          <FormAlert>No se pudo cargar el reporte general: {error}</FormAlert>
          <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
            <RefreshCw className="size-4" aria-hidden />
            Reintentar
          </Button>
        </div>
      ) : loading ? (
        <div className="mt-10 space-y-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
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

          <section aria-labelledby="finanzas" className="mt-8">
            <h2
              id="finanzas"
              className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-foreground"
            >
              <Coins className="size-5 text-primary" aria-hidden />
              Finanzas
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={Coins}
                label="Ingresos validados"
                value={`$${report.financial.payments.total_cup}`}
                caption="Suscripciones y visitas (por conciliación)"
                tone="primary"
              />
              <StatCard
                icon={UserPlus}
                label="Suscripciones pagadas"
                value={String(report.financial.payments.subscription_count)}
                caption={`$${report.financial.payments.by_plan.reduce(
                  (sum, plan) => sum + plan.total_cup,
                  0
                )} CUP en planes`}
              />
              <StatCard
                icon={CalendarCheck}
                label="Contratos de eventos"
                value={`$${report.financial.events.contract_value_cup}`}
                caption={`${report.financial.events.confirmed_bookings} de ${
                  report.financial.events.total_bookings
                } reservas confirmadas`}
              />
              <StatCard
                icon={UserX}
                label="Pagos sin conciliar"
                value={String(report.users.pending_payments)}
                caption={`${report.financial.events.pending_payment_bookings} eventos con pago pendiente`}
                tone="danger"
              />
            </div>
          </section>

          <section aria-labelledby="usuarios" className="mt-10">
            <h2
              id="usuarios"
              className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-foreground"
            >
              <UserPlus className="size-5 text-primary" aria-hidden />
              Nuevos usuarios y activación
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={UserPlus}
                label="Usuarios nuevos"
                value={String(report.users.new_total)}
                caption={`${report.users.new_corporate} corporativos · ${report.users.new_external} externos`}
              />
              <StatCard
                icon={ClipboardList}
                label="Empleados activados"
                value={`${report.precarga.conversion_percent}%`}
                caption={`${report.precarga.activated} de ${report.precarga.total} activaron su cuenta · ${report.precarga.pending} sin activar`}
                tone="primary"
              />
              <StatCard
                icon={UserX}
                label="Cuentas suspendidas"
                value={String(report.users.currently_suspended)}
                caption={`Sin pago después de ${GRACE_PERIOD_DAYS} días de gracia`}
                tone="danger"
              />
              <StatCard
                icon={Sparkles}
                label="Empleados rechazados"
                value={String(report.precarga.rejected)}
                caption="Registros cargados por RRHH marcados como rechazados"
              />
            </div>
          </section>

          <section aria-labelledby="operacion" className="mt-10">
            <h2
              id="operacion"
              className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-foreground"
            >
              <Gauge className="size-5 text-primary" aria-hidden />
              Operación
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={CalendarCheck}
                label="Reservas del período"
                value={String(report.reservations.total)}
                caption={`${report.reservations.completed} completadas`}
              />
              <StatCard
                icon={UserX}
                label="Tasa de inasistencia"
                value={`${report.reservations.no_show_percent}%`}
                caption={`${report.reservations.no_show} no-shows`}
                tone={report.reservations.no_show_percent >= 10 ? 'danger' : 'default'}
              />
              <StatCard
                icon={UserX}
                label="Tasa de cancelación"
                value={`${report.reservations.cancelled_percent}%`}
                caption={`${report.reservations.cancelled} canceladas`}
              />
              <StatCard
                icon={Gauge}
                label="Ocupación global"
                value={`${report.capacity.overall_occupancy_percent}%`}
                caption={`${report.capacity.total_reserved} de ${
                  report.capacity.total_period_capacity
                } plazas-día`}
                tone="primary"
              />
            </div>
          </section>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <section
              aria-labelledby="top-actividades"
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Trophy className="size-5" aria-hidden />
                </span>
                <div>
                  <h2
                    id="top-actividades"
                    className="font-display text-lg font-semibold tracking-tight text-foreground"
                  >
                    Top 5 actividades
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Plazas reservadas en el período
                  </p>
                </div>
              </div>
              <HorizontalBarChart
                className="mt-6"
                items={topActivityItems}
                formatValue={(value) => `${value} plazas`}
                emptyMessage=""
              />
            </section>

            <section
              aria-labelledby="top-empresas"
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="size-5" aria-hidden />
                </span>
                <div>
                  <h2
                    id="top-empresas"
                    className="font-display text-lg font-semibold tracking-tight text-foreground"
                  >
                    Top 5 empresas por uso
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Reservas generadas por sus titulares
                  </p>
                </div>
              </div>
              <HorizontalBarChart
                className="mt-6"
                items={topCompanyItems}
                formatValue={(value) => `${value} reservas`}
                emptyMessage=""
              />
            </section>
          </div>

          {report.reservations.total === 0 &&
          report.financial.payments.total_cup === 0 ? (
            <div className="mt-10">
              <EmptyState
                icon={Sparkles}
                title="Período sin actividad"
                description="No hay reservas ni ingresos validados en el rango seleccionado. Prueba con 'Este mes' o un rango personalizado más amplio."
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
