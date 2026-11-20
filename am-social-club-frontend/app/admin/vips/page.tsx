'use client'

import { useState } from 'react'
import { Pencil, Plus, RefreshCw, Search, Star } from 'lucide-react'
import { toast } from 'sonner'
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
import { VipFormDialog } from '@/components/Admin/VipFormDialog'
import { useAdminVips, useDebouncedValue, useVipActions } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import { cn } from '@/lib/utils'
import type { VipUser } from '@/lib/types'

const DEFAULT_PAGE_SIZE = 20

export default function AdminVipsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<VipUser | null>(null)
  const debouncedSearch = useDebouncedValue(search, 350)

  const { vips, total, loading, error, refetch } = useAdminVips({
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    page,
    limit: pageSize,
  })
  const { updateVip } = useVipActions()

  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  const toggleActive = async (vip: VipUser) => {
    try {
      await updateVip(vip.id, { is_active: !vip.is_active })
      toast.success(vip.is_active ? 'VIP desactivado' : 'VIP activado')
      refetch()
    } catch (err) {
      toast.error(describeApiError(err, 'No se pudo actualizar el VIP'))
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Visitantes
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Usuarios VIP
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Registra visitantes VIP con su nombre, carnet y número de acompañantes.
          Recepción los verifica y registra su entrada al llegar.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            placeholder="Buscar por nombre o CI..."
            className="h-12 pl-11"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            aria-label="Buscar VIP"
          />
        </div>

        <div className="w-full sm:max-w-52">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-12" aria-label="Filtrar por estado">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:max-w-44">
          <PageSizeSelect
            value={pageSize}
            onChange={(value) => {
              setPageSize(value)
              setPage(1)
            }}
            className="h-12"
          />
        </div>

        <Button className="h-12 sm:ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Nuevo VIP
        </Button>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((item) => (
              <SkeletonCard key={item} lines={2} />
            ))}
          </div>
        ) : error ? (
          <div className="space-y-5">
            <FormAlert>No se pudieron cargar los VIP: {error}</FormAlert>
            <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
              <RefreshCw className="size-4" aria-hidden />
              Reintentar
            </Button>
          </div>
        ) : vips.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Sin VIP registrados"
            description="Crea un VIP con su nombre, carnet y número de acompañantes."
            action={
              <Button className="h-11" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" aria-hidden />
                Nuevo VIP
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>VIP</TableHead>
                    <TableHead className="text-center">Acompañantes</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vips.map((vip) => (
                    <TableRow key={vip.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">{vip.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          CI {vip.ci}
                        </p>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-foreground">
                        {vip.partners_count}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                            vip.is_active
                              ? 'border-primary/30 bg-primary/5 text-primary'
                              : 'border-border bg-muted/60 text-muted-foreground'
                          )}
                        >
                          {vip.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 border-border bg-background"
                            onClick={() => setEditing(vip)}
                          >
                            <Pencil className="size-3.5" aria-hidden />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={cn(
                              'h-9 bg-background',
                              vip.is_active
                                ? 'border-danger/30 text-danger hover:bg-danger/10'
                                : 'border-primary/30 text-primary hover:bg-primary/10'
                            )}
                            onClick={() => void toggleActive(vip)}
                          >
                            {vip.is_active ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 ? (
              <div className="mt-5 flex items-center justify-between gap-4">
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
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 bg-background"
                    disabled={page >= totalPages}
                    onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <VipFormDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={refetch} />
      <VipFormDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        vip={editing}
        onSaved={refetch}
      />
    </div>
  )
}
