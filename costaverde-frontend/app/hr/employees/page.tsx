'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ClipboardList, RefreshCw, SearchX, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { EmptyState } from '@/components/Common/EmptyState'
import { FormAlert } from '@/components/Common/FormAlert'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { StatusBadge } from '@/components/Common/StatusBadge'
import { ReportExports } from '@/components/Common/ReportExports'
import { usePreEmployees } from '@/lib/hooks'
import { formatDate } from '@/lib/dates'
import type { PreEmployeeStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: PreEmployeeStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendientes de registro' },
  { value: 'activated', label: 'Activados' },
  { value: 'rejected', label: 'Rechazados' },
]

const STATUS_LABELS: Record<PreEmployeeStatus, string> = {
  pending: 'Pendiente',
  activated: 'Activado',
  rejected: 'Rechazado',
}

const STATUS_VARIANTS: Record<PreEmployeeStatus, 'pending' | 'positive' | 'negative'> = {
  pending: 'pending',
  activated: 'positive',
  rejected: 'negative',
}

export default function HrEmployeesPage() {
  const [status, setStatus] = useState<string>('all')
  const [search, setSearch] = useState('')

  const { employees, loading, error, refetch } = usePreEmployees(
    status === 'all' ? undefined : status
  )

  const normalizedSearch = search.trim().toLowerCase()
  const filtered = normalizedSearch
    ? employees.filter(
        (employee) =>
          employee.name.toLowerCase().includes(normalizedSearch) ||
          employee.ci.includes(normalizedSearch) ||
          (employee.email ?? '').toLowerCase().includes(normalizedSearch)
      )
    : employees
  const exportSections = [{
    title: 'Empleados precargados',
    columns: ['Nombre', 'CI', 'Correo', 'Teléfono', 'Empresa', 'Estado', 'Precargado'],
    rows: filtered.map((employee) => [
      employee.name,
      employee.ci,
      employee.email,
      employee.phone,
      employee.company,
      STATUS_LABELS[employee.status],
      formatDate(employee.imported_at, 'd MMM yyyy'),
    ]),
  }]

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Empleados
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Empleados precargados
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Estado de precargas de todas las empresas: quiénes ya se registraron y
          quiénes están pendientes.
        </p>
      </header>

      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-64">
          <Input
            type="search"
            placeholder="Buscar por nombre, CI o correo..."
            className="h-12"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Buscar empleados"
          />
        </div>

        <div className="w-full sm:max-w-56">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-12" aria-label="Filtrar por estado">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!loading && !error ? (
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground sm:ml-auto">
            {filtered.length} {filtered.length === 1 ? 'empleado' : 'empleados'}
          </p>
        ) : null}
        </div>
        <div className="flex justify-end border-t border-border pt-3">
          <ReportExports
            title="Empleados precargados"
            filename="empleados-precargados"
            sections={exportSections}
            disabled={loading || Boolean(error)}
          />
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((item) => (
              <SkeletonCard key={item} lines={2} />
            ))}
          </div>
        ) : error ? (
          <div className="space-y-5">
            <FormAlert>No se pudieron cargar los empleados: {error}</FormAlert>
            <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
              <RefreshCw className="size-4" aria-hidden />
              Reintentar
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={employees.length === 0 ? Users : SearchX}
            title={
              employees.length === 0
                ? 'Aún no hay empleados precargados'
                : 'Sin resultados'
            }
            description={
              employees.length === 0
                ? 'Sube un archivo CSV o Excel con empleados de cualquier empresa para que puedan registrarse.'
                : 'No encontramos empleados con esos criterios. Prueba con otro término o cambia el filtro.'
            }
            action={
              employees.length === 0 ? (
                <Button className="h-11" asChild>
                  <Link href="/hr/upload-employees">
                    <ClipboardList className="size-4" aria-hidden />
                    Cargar empleados
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-11 bg-background"
                  onClick={() => {
                    setSearch('')
                    setStatus('all')
                  }}
                >
                  Limpiar filtros
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Empleado</TableHead>
                  <TableHead className="hidden md:table-cell">CI</TableHead>
                  <TableHead className="hidden lg:table-cell">Correo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden sm:table-cell">Precargado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{employee.name}</p>
                      {employee.phone ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {employee.phone}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="font-mono text-sm tracking-wider text-foreground">
                        {employee.ci}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {employee.email ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={employee.status}
                        label={STATUS_LABELS[employee.status]}
                        variant={STATUS_VARIANTS[employee.status]}
                      />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(employee.imported_at, 'd MMM yyyy')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
