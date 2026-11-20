'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  Building2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
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
import { StatusBadge } from '@/components/Common/StatusBadge'
import { CompanyFormDialog } from '@/components/Admin/CompanyFormDialog'
import { useAuth } from '@/app/providers'
import { useAdminCompanyDetail, useAdminCompanies } from '@/lib/hooks'
import { formatShortDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { CompanySummary } from '@/lib/types'

const ASSOCIATE_RELATION_LABELS: Record<string, string> = {
  spouse: 'Cónyuge',
  son: 'Hijo',
  daughter: 'Hija',
  parent: 'Padre / Madre',
  sibling: 'Hermano / Hermana',
  other: 'Otro',
}

function matches(query: string, ...values: Array<string | null | undefined>): boolean {
  if (!query) return true
  const needle = query.toLowerCase()
  return values.some((value) => value?.toLowerCase().includes(needle))
}

function CompanyDetailPanel({
  company,
  onBack,
}: {
  company: CompanySummary
  onBack: () => void
}) {
  const [query, setQuery] = useState('')
  const { detail, loading, error, refetch } = useAdminCompanyDetail(company.id)

  const filteredMembers =
    detail?.members.filter((member) =>
      matches(query, member.name, member.ci, member.email, member.phone)
    ) ?? []

  const filteredAssociates =
    detail?.associates.filter(
      (associate) =>
        matches(query, associate.name, associate.ci) ||
        matches(query, associate.titular_name, associate.titular_ci)
    ) ?? []

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-9 text-muted-foreground hover:text-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver al listado
          </Button>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
            {company.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {company.total_users} titulares · {company.total_associates}{' '}
            asociados · {company.active_users} activos
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            className="h-11 pl-9"
            placeholder="Buscar por nombre o CI…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar miembros de la empresa"
          />
        </div>
      </div>

      {error ? (
        <div className="mt-6 space-y-4">
          <FormAlert>No se pudieron cargar los miembros: {error}</FormAlert>
          <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
            <RefreshCw className="size-4" aria-hidden />
            Reintentar
          </Button>
        </div>
      ) : loading ? (
        <div className="mt-6 space-y-6">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      ) : detail ? (
        <>
          <section aria-labelledby="titulares" className="mt-8">
            <h3
              id="titulares"
              className="font-display text-lg font-semibold tracking-tight text-foreground"
            >
              Titulares ({filteredMembers.length})
            </h3>
            {filteredMembers.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                {query
                  ? 'Ningún titular coincide con la búsqueda.'
                  : 'Esta empresa aún no tiene titulares registrados.'}
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Titular</TableHead>
                      <TableHead className="hidden sm:table-cell">Contacto</TableHead>
                      <TableHead className="text-center">Asociados</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="hidden md:table-cell">Registro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <p className="font-medium text-foreground">{member.name}</p>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            CI {member.ci}
                          </p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <p className="text-sm text-foreground">{member.email ?? '—'}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.phone ?? '—'}
                          </p>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-foreground">
                          {member.associate_count}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={member.user_status} scope="user" />
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {formatShortDate(member.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section aria-labelledby="asociados" className="mt-10">
            <h3
              id="asociados"
              className="font-display text-lg font-semibold tracking-tight text-foreground"
            >
              Asociados familiares ({filteredAssociates.length})
            </h3>
            {filteredAssociates.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                {query
                  ? 'Ningún asociado coincide con la búsqueda.'
                  : 'Los titulares de esta empresa aún no han registrado asociados.'}
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Asociado</TableHead>
                      <TableHead className="hidden sm:table-cell">Parentesco</TableHead>
                      <TableHead>Titular</TableHead>
                      <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssociates.map((associate) => (
                      <TableRow key={associate.id}>
                        <TableCell>
                          <p className="font-medium text-foreground">{associate.name}</p>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            CI {associate.ci}
                          </p>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                          {ASSOCIATE_RELATION_LABELS[associate.relation] ??
                            associate.relation}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground">
                            {associate.titular_name}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            CI {associate.titular_ci}
                          </p>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {associate.phone ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

export function CompanyDirectory() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<CompanySummary | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<CompanySummary | null>(null)
  const { user } = useAuth()
  const { companies, loading, error, refetch } = useAdminCompanies()

  const canManage = user?.role_name === 'admin'

  const filtered = companies.filter((company) =>
    matches(query, company.name)
  )

  if (selected) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <CompanyDetailPanel
          company={selected}
          onBack={() => setSelected(null)}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Directorio
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Usuarios por empresa
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Consulta los titulares y sus asociados familiares en cada empresa
          del ministerio.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            className="h-11 pl-9"
            placeholder="Buscar empresa…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar empresa"
          />
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'empresa' : 'empresas'}
        </p>
        {canManage ? (
          <Button className="h-11" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Nueva empresa
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-10 space-y-5">
          <FormAlert>No se pudieron cargar las empresas: {error}</FormAlert>
          <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
            <RefreshCw className="size-4" aria-hidden />
            Reintentar
          </Button>
        </div>
      ) : loading ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <SkeletonCard key={item} lines={3} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Building2}
            title={query ? 'Sin coincidencias' : 'Aún no hay empresas'}
            description={
              query
                ? 'Prueba con otro nombre de empresa.'
                : 'Las empresas aparecen aquí cuando RRHH carga empleados con ese nombre.'
            }
          />
        </div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {filtered.map((company) => (
            <div
              key={company.id}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="size-5" aria-hidden />
                </span>
                <div className="flex items-center gap-2">
                  {!company.is_active ? (
                    <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Inactiva
                    </span>
                  ) : null}
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => setEditing(company)}
                      className="grid size-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:text-primary"
                      aria-label={`Editar ${company.name}`}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(company)}
                className="mt-4 block w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <h2 className="font-display text-lg font-semibold tracking-tight text-foreground group-hover:text-primary">
                  {company.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {company.total_members} miembros en total
                </p>

                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-muted/50 p-2.5">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      <Users className="mr-1 inline size-3" aria-hidden />
                      Activos
                    </dt>
                    <dd className="mt-1 font-display text-xl font-semibold text-primary">
                      {company.active_users}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-2.5">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Pendientes
                    </dt>
                    <dd
                      className={cn(
                        'mt-1 font-display text-xl font-semibold',
                        company.pending_payment_users +
                          company.pending_activation_users >
                          0 &&
                          'text-danger'
                      )}
                    >
                      {company.pending_payment_users +
                        company.pending_activation_users}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-2.5">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      <UserPlus className="mr-1 inline size-3" aria-hidden />
                      Asociados
                    </dt>
                    <dd className="mt-1 font-display text-xl font-semibold text-foreground">
                      {company.total_associates}
                    </dd>
                  </div>
                </dl>

                {company.suspended_users > 0 ? (
                  <p className="mt-3 text-xs font-semibold text-danger">
                    {company.suspended_users}{' '}
                    {company.suspended_users === 1
                      ? 'usuario suspendido'
                      : 'usuarios suspendidos'}{' '}
                    por falta de pago
                  </p>
                ) : null}
              </button>
            </div>
          ))}
        </div>
      )}

      {canManage ? (
        <CompanyFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          company={null}
          onSaved={refetch}
        />
      ) : null}
      {canManage ? (
        <CompanyFormDialog
          open={editing !== null}
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
          company={editing}
          onSaved={refetch}
        />
      ) : null}
    </div>
  )
}
