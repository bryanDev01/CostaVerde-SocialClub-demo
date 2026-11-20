'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Search, Users } from 'lucide-react'
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
import { PageSizeSelect } from '@/components/Common/PageSizeSelect'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { StatusBadge } from '@/components/Common/StatusBadge'
import { ReportExports } from '@/components/Common/ReportExports'
import { useAdminCompanies, useDebouncedValue, useHrUsers } from '@/lib/hooks'
import { USER_STATUS_LABELS } from '@/lib/constants'
import { formatShortDate } from '@/lib/dates'
import type { UserStatus } from '@/lib/types'

const DEFAULT_PAGE_SIZE = 20

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = (
  Object.entries(USER_STATUS_LABELS) as [UserStatus, string][]
).map(([value, label]) => ({ value, label }))

interface UserDirectoryProps {
  eyebrow: string
  backHref?: string
  backLabel?: string
  hideStatusAndType?: boolean
}

export function UserDirectory({ eyebrow, backHref, backLabel, hideStatusAndType = false }: UserDirectoryProps) {
  const [companyId, setCompanyId] = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)
  const { companies, loading: companiesLoading, error: companiesError } = useAdminCompanies()
  const { users, total, loading, error, refetch, getAllUsers } = useHrUsers({
    companyId: companyId === 'all' ? undefined : companyId,
    status: status === 'all' ? undefined : status,
    search: debouncedSearch || undefined,
    page,
    limit: pageSize,
  })
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  const resetPage = () => setPage(1)
  const buildExportSections = (exportUsers: typeof users) => [{
    title: 'Usuarios del sistema',
    columns: hideStatusAndType
      ? ['Nombre', 'CI', 'Correo', 'Empresa', 'Registro']
      : ['Nombre', 'CI', 'Correo', 'Empresa', 'Tipo', 'Estado', 'Registro'],
    rows: exportUsers.map((user) => {
      const base = [
        user.name,
        user.ci,
        user.email,
        user.company_name ?? 'Sin empresa',
      ]
      const meta = hideStatusAndType
        ? []
        : [
            user.user_type === 'corporate' ? 'Corporativo' : 'Externo',
            USER_STATUS_LABELS[user.user_status],
          ]
      return [...base, ...meta, formatShortDate(user.created_at)]
    }),
  }]
  const loadExportSections = async () => buildExportSections(await getAllUsers())

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        {backHref ? (
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary hover:underline">
            <ArrowLeft className="size-3.5" aria-hidden /> {backLabel ?? 'Volver'}
          </Link>
        ) : null}
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Usuarios del sistema
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {hideStatusAndType
            ? 'Consulta las cuentas registradas de tu empresa.'
            : 'Consulta cuentas corporativas y externas de cualquier empresa, con su estado actual.'}
        </p>
      </header>

      <div className="mt-8 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_minmax(14rem,1fr)_12rem_11rem] xl:items-end">
          <div className="relative w-full min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); resetPage() }}
              placeholder="Buscar nombre, correo o CI"
              className="h-11 pl-10"
              aria-label="Buscar usuarios"
            />
          </div>
          <Select value={companyId} onValueChange={(value) => { setCompanyId(value); resetPage() }}>
            <SelectTrigger className="h-11 w-full" aria-label="Filtrar por empresa">
              <SelectValue placeholder="Todas las empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las empresas</SelectItem>
              <SelectItem value="none">Sin empresa / visitantes</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => { setStatus(value); resetPage() }}>
            <SelectTrigger className="h-11 w-full" aria-label="Filtrar por estado">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PageSizeSelect
            value={pageSize}
            onChange={(value) => {
              setPageSize(value)
              resetPage()
            }}
            className="h-11 w-full"
          />
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {loading ? 'Cargando' : `${total} ${total === 1 ? 'usuario' : 'usuarios'}`}
          </p>
          <ReportExports title="Directorio de usuarios" filename="directorio-usuarios" sections={buildExportSections(users)} loadSections={loadExportSections} disabled={loading} />
        </div>
      </div>

      {companiesError ? <div className="mt-4"><FormAlert>No se pudieron cargar las empresas: {companiesError}</FormAlert></div> : null}
      {companiesLoading ? <span className="sr-only">Cargando empresas</span> : null}

      <div className="mt-6">
        {error ? (
          <div className="space-y-4">
            <FormAlert>No se pudieron cargar los usuarios: {error}</FormAlert>
            <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
              <RefreshCw className="size-4" aria-hidden /> Reintentar
            </Button>
          </div>
        ) : loading ? (
          <div className="space-y-4"><SkeletonCard lines={3} /><SkeletonCard lines={3} /></div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="Sin usuarios" description="No hay cuentas que coincidan con los filtros seleccionados." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Usuario</TableHead>
                    <TableHead className="hidden md:table-cell">CI</TableHead>
                    <TableHead className="hidden lg:table-cell">Correo</TableHead>
                    <TableHead>Empresa</TableHead>
                    {hideStatusAndType ? null : <TableHead>Tipo</TableHead>}
                    {hideStatusAndType ? null : <TableHead>Estado</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatShortDate(user.created_at)}</p>
                      </TableCell>
                      <TableCell className="hidden font-mono text-sm md:table-cell">{user.ci}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{user.email ?? '—'}</TableCell>
                      <TableCell className="text-sm">{user.company_name ?? 'Sin empresa'}</TableCell>
                      {hideStatusAndType ? null : (
                        <TableCell className="text-sm">{user.user_type === 'corporate' ? 'Corporativo' : 'Externo'}</TableCell>
                      )}
                      {hideStatusAndType ? null : (
                        <TableCell><StatusBadge status={user.user_status} scope="user" /></TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 ? (
              <div className="mt-5 flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-10 bg-background" disabled={page <= 1} onClick={() => setPage((value) => Math.max(value - 1, 1))}>
                    <ChevronLeft className="size-4" aria-hidden /> Anterior
                  </Button>
                  <Button variant="outline" className="h-10 bg-background" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(value + 1, totalPages))}>
                    Siguiente <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
