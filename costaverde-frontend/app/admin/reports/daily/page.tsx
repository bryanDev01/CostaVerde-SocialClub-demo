'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronDown,
  PartyPopper,
  Printer,
  Users,
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
import { useAdminDailyReport } from '@/lib/hooks'
import { formatDate, formatDateTime, todayInputValue } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { DailyActivityReport } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  pending_reminder: 'Por confirmar (48h)',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

function statusBadgeClass(status: string): string {
  if (status === 'no_show') {
    return 'border-danger/30 bg-danger/5 text-danger'
  }
  if (status === 'completed' || status === 'confirmed') {
    return 'border-primary/30 bg-primary/5 text-primary'
  }
  return 'border-border bg-muted/60 text-muted-foreground'
}

function ActivityCard({ activity }: { activity: DailyActivityReport }) {
  const [expanded, setExpanded] = useState(false)
  const percent = Math.min(activity.occupancy_percent, 100)
  const isFull = activity.occupancy_percent >= 100

  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
            {activity.activity_name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[activity.category_name, activity.location]
              .filter(Boolean)
              .join(' · ') || 'Sin categoría'}
          </p>
        </div>
        <div className="text-right">
          <p
            className={cn(
              'font-display text-2xl font-semibold',
              isFull ? 'text-danger' : 'text-primary'
            )}
          >
            {activity.total_reserved}
            <span className="text-sm font-normal text-muted-foreground">
              /{activity.capacity}
            </span>
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {activity.occupancy_percent}% ocupado
          </p>
        </div>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={activity.occupancy_percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Ocupación de ${activity.activity_name}`}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isFull ? 'bg-danger' : 'bg-primary'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          {activity.reservation_count}{' '}
          {activity.reservation_count === 1 ? 'reserva' : 'reservas'} activas
        </span>
        <span>{activity.available} plazas disponibles</span>
        {activity.no_show_count > 0 ? (
          <span className="font-semibold text-danger">
            {activity.no_show_count} {activity.no_show_count === 1 ? 'falta' : 'faltas'}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <Button
          variant="outline"
          size="sm"
          className="h-9 bg-background"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronDown
            className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}
            aria-hidden
          />
          {expanded ? 'Ocultar asistentes' : 'Ver asistentes'}
        </Button>
      </div>

      {expanded ? (
        activity.attendees.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Asistente</TableHead>
                  <TableHead className="hidden sm:table-cell">Empresa</TableHead>
                  <TableHead className="text-center">Personas</TableHead>
                  <TableHead className="hidden md:table-cell">Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">Check-in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.attendees.map((attendee) => (
                  <TableRow key={attendee.reservation_id}>
                    <TableCell>
                      <p className="font-medium text-foreground">
                        {attendee.user_name}
                        {attendee.created_by_name ? (
                          <span className="text-xs font-normal text-muted-foreground">
                            {' '}
                            · por {attendee.created_by_name}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        CI {attendee.user_ci}
                      </p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {attendee.company_name ?? 'Externo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-foreground">
                      {attendee.quantity}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                          statusBadgeClass(attendee.status)
                        )}
                      >
                        {STATUS_LABELS[attendee.status] ?? attendee.status}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {attendee.attended_at ? formatDateTime(attendee.attended_at) : '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Nadie reservó esta actividad para el día seleccionado.
          </p>
        )
      ) : null}
    </article>
  )
}

export default function AdminDailyReportPage() {
  const [date, setDate] = useState(todayInputValue())
  const { report, loading, error, refetch } = useAdminDailyReport(date)

  const statusEntries = report
    ? Object.entries(report.reservations_by_status)
    : []
  const reportSections = [
    {
      title: 'Resumen diario',
      columns: ['Fecha', 'Aforo', 'Capacidad global', 'Ocupación %', 'Reservas corporativas', 'Reservas externas'],
      rows: report ? [[report.date, report.total_aforo, report.global_capacity, report.occupancy_percent, report.corporate_reservations, report.external_reservations]] : [],
    },
    {
      title: 'Reservas por estado',
      columns: ['Estado', 'Cantidad'],
      rows: statusEntries.map(([status, count]) => [STATUS_LABELS[status] ?? status, count]),
    },
    {
      title: 'Actividades',
      columns: ['Actividad', 'Local', 'Plazas reservadas', 'Capacidad', 'Disponibles', 'Reservas', 'No asistencias'],
      rows: (report?.activities ?? []).map((activity) => [activity.activity_name, activity.location ?? '', activity.total_reserved, activity.capacity, activity.available, activity.reservation_count, activity.no_show_count]),
    },
    {
      title: 'Asistentes',
      columns: ['Actividad', 'Nombre', 'CI', 'Empresa', 'Personas', 'Estado', 'Check-in'],
      rows: (report?.activities ?? []).flatMap((activity) => activity.attendees.map((attendee) => [activity.activity_name, attendee.user_name, attendee.user_ci, attendee.company_name ?? 'Externo', attendee.quantity, STATUS_LABELS[attendee.status] ?? attendee.status, attendee.attended_at ? formatDateTime(attendee.attended_at) : ''])),
    },
    {
      title: 'Eventos',
      columns: ['Evento', 'Local', 'Responsable', 'CI', 'Invitados', 'Estado', 'Pago'],
      rows: (report?.events ?? []).map((event) => [event.event_name, event.location, event.user_name, event.user_ci, event.guest_count, event.status, event.payment_status ?? '']),
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
          Reporte diario
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Resumen del día
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Aforo global, ocupación por actividad con lista de asistentes y
          eventos programados para la fecha seleccionada.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <label
            htmlFor="daily-report-date"
            className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Fecha
          </label>
          <Input
            id="daily-report-date"
            type="date"
            className="h-11 w-44"
            value={date}
            max={todayInputValue()}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportExports title="Resumen diario" filename={`reporte-diario-${date}`} sections={reportSections} disabled={loading || Boolean(error)} />
          <Button
            variant="outline"
            className="h-11 bg-background"
            onClick={() => window.print()}
          >
            <Printer className="size-4" aria-hidden />
            Imprimir
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mt-10 space-y-5">
          <FormAlert>No se pudo cargar el reporte diario: {error}</FormAlert>
          <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
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
            {formatDate(report.date)}
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Users className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Aforo del día
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-primary">
                {report.total_aforo}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  / {report.global_capacity}
                </span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full',
                    report.occupancy_percent >= 100 ? 'bg-danger' : 'bg-primary'
                  )}
                  style={{ width: `${Math.min(report.occupancy_percent, 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {report.occupancy_percent}% del aforo global
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Corporativas vs externas
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
                {report.corporate_reservations}
                <span className="mx-1.5 text-base font-normal text-muted-foreground">/</span>
                {report.external_reservations}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Reservas de socios corporativos vs visitantes externos
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <PartyPopper className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Eventos del día
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
                {report.events.length}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {report.events.length === 1
                  ? 'Reserva de evento'
                  : 'Reservas de eventos'}
              </p>
            </article>
          </div>

          {statusEntries.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-2">
              {statusEntries.map(([status, count]) => (
                <span
                  key={status}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
                    statusBadgeClass(status)
                  )}
                >
                  {STATUS_LABELS[status] ?? status}
                  <span className="font-mono">{count}</span>
                </span>
              ))}
            </div>
          ) : null}

          <section aria-labelledby="actividades-dia" className="mt-10">
            <h2
              id="actividades-dia"
              className="font-display text-xl font-semibold tracking-tight text-foreground"
            >
              Ocupación por actividad
            </h2>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              {report.activities.map((activity) => (
                <ActivityCard key={activity.activity_id} activity={activity} />
              ))}
            </div>
          </section>

          {report.events.length > 0 ? (
            <section aria-labelledby="eventos-dia" className="mt-10">
              <h2
                id="eventos-dia"
                className="font-display text-xl font-semibold tracking-tight text-foreground"
              >
                Eventos programados
              </h2>
              <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Evento</TableHead>
                      <TableHead className="hidden sm:table-cell">Local</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead className="text-center">Invitados</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="hidden md:table-cell">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium text-foreground">
                          {event.event_name}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                          {event.location}
                        </TableCell>
                        <TableCell>
                          <p className="text-foreground">{event.user_name}</p>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            CI {event.user_ci}
                          </p>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-foreground">
                          {event.guest_count}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          ${event.total_price_cup}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            CUP
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span
                            className={cn(
                              'inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                              event.status === 'completed' ||
                                event.status === 'confirmed'
                                ? 'border-primary/30 bg-primary/5 text-primary'
                                : event.status === 'pending_payment'
                                  ? 'border-danger/30 bg-danger/5 text-danger'
                                  : 'border-border bg-muted/60 text-muted-foreground'
                            )}
                          >
                            {event.status === 'pending_payment'
                              ? 'Pago pendiente'
                              : event.status === 'confirmed'
                                ? 'Confirmado'
                                : event.status === 'completed'
                                  ? 'Completado'
                                  : event.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ) : null}

          {report.activities.every((activity) => activity.attendees.length === 0) &&
          report.events.length === 0 ? (
            <div className="mt-10">
              <EmptyState
                icon={CalendarDays}
                title="Día sin reservas"
                description="No hay reservas de actividades ni eventos para la fecha seleccionada."
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
