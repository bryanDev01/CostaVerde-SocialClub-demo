'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Search,
  SearchX,
  UserX,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/Common/EmptyState'
import { FormAlert } from '@/components/Common/FormAlert'
import { PageSizeSelect } from '@/components/Common/PageSizeSelect'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { ReportExports, type ReportSection } from '@/components/Common/ReportExports'
import { UserTable } from '@/components/Admin/UserTable'
import { StaffTable, staffRoleLabel } from '@/components/Admin/StaffTable'
import {
  useAdminStaff,
  useAdminUsers,
  useDebouncedValue,
  useHrUserStatusReport,
} from '@/lib/hooks'
import { USER_STATUS_LABELS } from '@/lib/constants'
import { formatShortDate } from '@/lib/dates'
import type { StaffAccount, User, UserStatus } from '@/lib/types'

const DEFAULT_PAGE_SIZE = 20

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = (
  Object.entries(USER_STATUS_LABELS) as [UserStatus, string][]
).map(([value, label]) => ({ value, label }))

const USER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'corporate', label: 'Corporativo' },
  { value: 'external', label: 'Externo' },
]

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [userType, setUserType] = useState<string>('all')
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebouncedValue(search, 350)

  const { users, total, loading, error, refetch, getAllUsers } = useAdminUsers({
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    userType: userType === 'all' ? undefined : userType,
    page,
    limit: pageSize,
  })

  const {
    accounts: staffAccounts,
    loading: staffLoading,
    error: staffError,
    refetch: refetchStaff,
  } = useAdminStaff()

  const { rows: statusRows } = useHrUserStatusReport()

  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  const accountTotal = statusRows.reduce((sum, row) => sum + row.total, 0)
  const accountActive = statusRows.reduce(
    (sum, row) =>
      sum +
      (row.user_status === 'active' || row.user_status === 'external_active'
        ? row.total
        : 0),
    0
  )
  const accountPending = statusRows.reduce(
    (sum, row) =>
      sum +
      (row.user_status === 'pending_activation' ||
      row.user_status === 'pending_payment'
        ? row.total
        : 0),
    0
  )
  const accountInactive = statusRows.reduce(
    (sum, row) =>
      sum +
      (row.user_status === 'inactive' || row.user_status === 'suspended'
        ? row.total
        : 0),
    0
  )

  const buildExportSections = (list: User[], staff: StaffAccount[]): ReportSection[] => [
    {
      title: 'Usuarios por estado',
      columns: ['Empresa', 'Tipo', 'Estado', 'Cantidad'],
      rows: statusRows.map((row) => [
        row.company_name,
        row.user_type === 'corporate' ? 'Corporativo' : 'Externo',
        USER_STATUS_LABELS[row.user_status],
        row.total,
      ]),
    },
    {
      title: 'Personal del sistema',
      columns: ['Nombre', 'CI', 'Correo', 'Rol', 'Estado', 'Registro'],
      rows: staff.map((account) => [
        account.name,
        account.ci,
        account.email ?? '—',
        staffRoleLabel(account.role_name),
        USER_STATUS_LABELS[account.user_status],
        formatShortDate(account.created_at),
      ]),
    },
    {
      title: 'Usuarios asociados',
      columns: ['Nombre', 'CI', 'Correo', 'Tipo', 'Estado', 'Registro'],
      rows: list.map((user) => [
        user.name,
        user.ci,
        user.email ?? '—',
        user.user_type === 'corporate' ? 'Corporativo' : 'Externo',
        USER_STATUS_LABELS[user.user_status],
        formatShortDate(user.created_at),
      ]),
    },
  ]
  const loadExportSections = async () =>
    buildExportSections(await getAllUsers(), staffAccounts ?? [])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    setPage(1)
  }

  const handleUserTypeChange = (value: string) => {
    setUserType(value)
    setPage(1)
  }

  const handlePageSizeChange = (value: number) => {
    setPageSize(value)
    setPage(1)
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Usuarios
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Gestión de usuarios
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Dos listados separados: el personal del sistema (administración,
          recursos humanos y recepción) y los usuarios asociados de las empresas.
        </p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-border bg-card p-5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Users className="size-4" aria-hidden />
          </span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Usuarios asociados
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-foreground">
            {accountTotal}
          </p>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <CheckCircle2 className="size-4" aria-hidden />
          </span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Activos
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-foreground">
            {accountActive}
          </p>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Clock className="size-4" aria-hidden />
          </span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Pendientes
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-foreground">
            {accountPending}
          </p>
        </article>
        <article className="rounded-xl border border-border bg-card p-5">
          <span className="grid size-9 place-items-center rounded-lg bg-danger/10 text-danger">
            <UserX className="size-4" aria-hidden />
          </span>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Suspendidos o inactivos
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-foreground">
            {accountInactive}
          </p>
        </article>
      </div>

      <section className="mt-12" aria-labelledby="staff-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="staff-title" className="font-display text-xl font-semibold text-foreground">
              Personal del sistema
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Administración, recursos humanos y recepción. Para crear cuentas o
              cambiar roles usa la sección{' '}
              <Link href="/admin/staff" className="font-medium text-primary underline-offset-4 hover:underline">
                Personal
              </Link>
              .
            </p>
          </div>
          {!staffLoading && !staffError ? (
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {(staffAccounts ?? []).length} cuentas
            </p>
          ) : null}
        </div>

        <div className="mt-6">
          {staffLoading ? (
            <SkeletonCard lines={3} />
          ) : staffError ? (
            <div className="space-y-5">
              <FormAlert>No se pudo cargar el personal: {staffError}</FormAlert>
              <Button variant="outline" className="h-11 bg-background" onClick={refetchStaff}>
                <RefreshCw className="size-4" aria-hidden />
                Reintentar
              </Button>
            </div>
          ) : (staffAccounts ?? []).length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin personal registrado"
              description="Las cuentas de administración, recursos humanos y recepción aparecerán aquí."
            />
          ) : (
            <StaffTable accounts={staffAccounts ?? []} />
          )}
        </div>
      </section>

      <section className="mt-16 border-t border-border pt-12" aria-labelledby="associated-title">
        <h2 id="associated-title" className="font-display text-xl font-semibold text-foreground">
          Usuarios asociados
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Usuarios de las empresas y visitantes externos. Busca por nombre, correo o CI,
          y activa, suspende o desactiva cuentas según lo requiera la administración.
        </p>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative w-full max-w-sm">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Buscar por nombre, correo o CI..."
              className="h-12 pl-11"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              aria-label="Buscar usuarios asociados"
            />
          </div>

          <div className="w-full sm:max-w-56">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-12" aria-label="Filtrar por estado">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:max-w-48">
            <Select value={userType} onValueChange={handleUserTypeChange}>
              <SelectTrigger className="h-12" aria-label="Filtrar por tipo de cuenta">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                {USER_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:max-w-44">
            <PageSizeSelect value={pageSize} onChange={handlePageSizeChange} className="h-12" />
          </div>

          <div className="flex items-center gap-4 lg:ml-auto">
            {!loading && !error ? (
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {total} {total === 1 ? 'usuario' : 'usuarios'}
              </p>
            ) : null}
            <ReportExports
              title="Usuarios del sistema"
              filename="usuarios-sistema"
              sections={buildExportSections(users, staffAccounts ?? [])}
              loadSections={loadExportSections}
              disabled={loading}
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
              <FormAlert>No se pudieron cargar los usuarios: {error}</FormAlert>
              <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
                <RefreshCw className="size-4" aria-hidden />
                Reintentar
              </Button>
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Sin resultados"
              description="No encontramos usuarios con esos criterios. Prueba con otro término o cambia el filtro de estado."
              action={
                <Button
                  variant="outline"
                  className="h-11 bg-background"
                  onClick={() => {
                    setSearch('')
                    setStatus('all')
                    setUserType('all')
                    setPage(1)
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <>
              <UserTable users={users} onChanged={refetch} />

              {totalPages > 1 ? (
                <div className="mt-6 flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="h-10 bg-background"
                      disabled={page <= 1}
                      onClick={() => setPage((value) => Math.max(value - 1, 1))}
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 bg-background"
                      disabled={page >= totalPages}
                      onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
                    >
                      Siguiente
                      <ChevronRight className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
