'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BarChart3, Building2, CheckCircle2, Clock, UserX, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FormAlert } from '@/components/Common/FormAlert'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { ReportExports } from '@/components/Common/ReportExports'
import { useAdminCompanies, useHrUserStatusReport } from '@/lib/hooks'
import { USER_STATUS_LABELS } from '@/lib/constants'

interface UserStatusReportProps {
  eyebrow: string
  backHref: string
  backLabel: string
  directoryHref?: string
  preloadHref?: string
  preloadLabel?: string
}

export function UserStatusReport({
  eyebrow,
  backHref,
  backLabel,
  directoryHref = '/hr/users',
  preloadHref = '/hr/employees',
  preloadLabel = 'Ver precargas HR',
}: UserStatusReportProps) {
  const [companyId, setCompanyId] = useState('all')
  const { companies } = useAdminCompanies()
  const { rows, loading, error, refetch } = useHrUserStatusReport(
    companyId === 'all' ? undefined : companyId
  )
  const total = rows.reduce((sum, row) => sum + row.total, 0)
  const active = rows.reduce(
    (sum, row) => sum + (row.user_status === 'active' || row.user_status === 'external_active' ? row.total : 0),
    0
  )
  const pending = rows.reduce(
    (sum, row) => sum + (row.user_status === 'pending_activation' || row.user_status === 'pending_payment' ? row.total : 0),
    0
  )
  const inactive = rows.reduce(
    (sum, row) => sum + (row.user_status === 'inactive' || row.user_status === 'suspended' ? row.total : 0),
    0
  )
  const exportSections = [{
    title: 'Usuarios por empresa y estado',
    columns: ['Empresa', 'Tipo', 'Estado', 'Cantidad'],
    rows: rows.map((row) => [
      row.company_name,
      row.user_type === 'corporate' ? 'Corporativo' : 'Externo',
      USER_STATUS_LABELS[row.user_status],
      row.total,
    ]),
  }]

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden /> {backLabel}
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Estado de usuarios</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Resumen global por empresa, tipo de cuenta y estado. Este reporte no contiene pagos ni ingresos.
        </p>
      </header>

      <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
        <div className="w-full sm:max-w-sm">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground" htmlFor="report-company">Empresa</label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger id="report-company" className="h-11" aria-label="Filtrar reporte por empresa">
              <SelectValue placeholder="Todas las empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las empresas</SelectItem>
              <SelectItem value="none">Sin empresa / visitantes</SelectItem>
              {companies.map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <ReportExports title="Estado de usuarios" filename="reporte-estado-usuarios" sections={exportSections} disabled={loading} />
      </div>

      {error ? (
        <div className="mt-8 space-y-4">
          <FormAlert>No se pudo cargar el reporte: {error}</FormAlert>
          <Button variant="outline" className="h-11 bg-background" onClick={refetch}>Reintentar</Button>
        </div>
      ) : loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-3"><SkeletonCard lines={2} /><SkeletonCard lines={2} /><SkeletonCard lines={2} /></div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-border bg-card p-5">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Users className="size-4" aria-hidden /></span>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Cuentas</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">{total}</p>
            </article>
            <article className="rounded-xl border border-border bg-card p-5">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><CheckCircle2 className="size-4" aria-hidden /></span>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Activas</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">{active}</p>
            </article>
            <article className="rounded-xl border border-border bg-card p-5">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Clock className="size-4" aria-hidden /></span>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Pendientes</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">{pending}</p>
            </article>
            <article className="rounded-xl border border-border bg-card p-5">
              <span className="grid size-9 place-items-center rounded-lg bg-danger/10 text-danger"><UserX className="size-4" aria-hidden /></span>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Suspendidas o inactivas</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">{inactive}</p>
            </article>
          </div>

          {rows.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No hay cuentas para los filtros seleccionados.</div>
          ) : (
            <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card">
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Empresa</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Cuentas</TableHead></TableRow></TableHeader>
                <TableBody>{rows.map((row) => <TableRow key={`${row.company_id ?? 'none'}-${row.user_type}-${row.user_status}`}><TableCell className="font-medium">{row.company_name}</TableCell><TableCell>{row.user_type === 'corporate' ? 'Corporativo' : 'Externo'}</TableCell><TableCell>{USER_STATUS_LABELS[row.user_status]}</TableCell><TableCell className="text-right font-semibold">{row.total}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="outline" className="h-10 bg-background" asChild><Link href={directoryHref}><Building2 className="size-4" aria-hidden /> Ver cuentas</Link></Button>
            <Button variant="outline" className="h-10 bg-background" asChild><Link href={preloadHref}><BarChart3 className="size-4" aria-hidden /> {preloadLabel}</Link></Button>
          </div>
        </>
      )}
    </div>
  )
}
