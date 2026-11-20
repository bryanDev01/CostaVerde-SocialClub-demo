'use client'

import { useState } from 'react'
import { Lock, Pencil, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { FormField } from '@/components/Common/FormField'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { useAdminRoles, useRoleMutations } from '@/lib/hooks'
import { STAFF_PERMISSION_LABELS } from '@/lib/staff'
import { describeApiError } from '@/lib/errorMessages'
import { cn } from '@/lib/utils'
import type { StaffPermission, StaffRole } from '@/lib/types'

const PERMISSION_ENTRIES = Object.entries(STAFF_PERMISSION_LABELS) as [
  StaffPermission,
  string,
][]

interface RoleFormProps {
  role: StaffRole | null
  onSaved: () => void
  onClose: () => void
}

function RoleForm({ role, onSaved, onClose }: RoleFormProps) {
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { createRole, updateRole } = useRoleMutations()

  const isEditing = Boolean(role)

  const togglePermission = (permission: StaffPermission) => {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((value) => value !== permission)
        : [...current, permission]
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (isEditing && role) {
        await updateRole(role.id, { description: description || null, permissions })
        toast.success('Rol actualizado')
      } else {
        await createRole({ name, description: description || null, permissions })
        toast.success('Rol creado')
      }
      onSaved()
    } catch (err) {
      setError(describeApiError(err, 'No se pudo guardar el rol'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar rol' : 'Nuevo rol interno'}</DialogTitle>
        <DialogDescription>
          Los roles del sistema (admin, RR. HH., recepción y socio) no se pueden
          modificar. Los roles que crees aquí agrupan permisos para cuentas internas.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 space-y-4">
        {error ? <FormAlert>{error}</FormAlert> : null}

        <FormField
          label="Nombre"
          htmlFor="role-name"
          hint={isEditing ? 'No editable' : 'minúsculas, 3-32 caracteres'}
        >
          <Input
            id="role-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isEditing || saving}
            placeholder="cajero"
            autoComplete="off"
            required
          />
        </FormField>

        <FormField label="Descripción" htmlFor="role-description" hint="opcional">
          <Input
            id="role-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={saving}
            placeholder="Cobra entradas y valida cobros externos"
            maxLength={255}
          />
        </FormField>

        <fieldset>
          <legend className="text-sm font-medium text-foreground">Permisos</legend>
          <div className="mt-3 grid gap-2">
            {PERMISSION_ENTRIES.map(([permission, label]) => (
              <label
                key={permission}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--primary)]"
                  checked={permissions.includes(permission)}
                  onChange={() => togglePermission(permission)}
                  disabled={saving}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear rol'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function AdminRolesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StaffRole | null>(null)
  const { roles, loading, error, refetch } = useAdminRoles()
  const { deleteRole } = useRoleMutations()

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (role: StaffRole) => {
    setEditing(role)
    setFormOpen(true)
  }

  const handleDelete = async (role: StaffRole) => {
    if (!window.confirm(`¿Eliminar el rol "${role.name}"?`)) return
    try {
      await deleteRole(role.id)
      toast.success('Rol eliminado')
      refetch()
    } catch (err) {
      toast.error(describeApiError(err, 'No se pudo eliminar el rol'))
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Seguridad
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Roles internos
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Crea roles operativos combinando permisos. Los roles del sistema se
          mantienen fijos; los personalizados puedes editarlos o eliminarlos
          mientras no tengan cuentas asignadas.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button onClick={openCreate} className="h-11">
          <Plus className="size-4" aria-hidden />
          Nuevo rol
        </Button>
        <Button variant="outline" className="h-11" onClick={refetch} disabled={loading}>
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden />
          Actualizar
        </Button>
      </div>

      {error ? (
        <div className="mt-6">
          <FormAlert>{error}</FormAlert>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6">
          <SkeletonCard />
        </div>
      ) : !roles || roles.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={ShieldCheck}
          title="Sin roles definidos"
          description="Crea el primer rol interno para agrupar permisos operativos."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Nuevo rol
            </Button>
          }
        />
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rol</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Permisos</TableHead>
                <TableHead className="text-right">Cuentas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      {role.name}
                      {role.is_core ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          <Lock className="size-3" aria-hidden />
                          Sistema
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-64 text-sm text-muted-foreground">
                    {role.description ?? '—'}
                  </TableCell>
                  <TableCell>
                    {role.permissions.length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.map((permission) => (
                          <span
                            key={permission}
                            className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                          >
                            {STAFF_PERMISSION_LABELS[permission as StaffPermission] ??
                              permission}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {role.user_count}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {role.is_core ? (
                        <span className="text-xs text-muted-foreground">Protegido</span>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(role)}
                            aria-label={`Editar ${role.name}`}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { void handleDelete(role) }}
                            aria-label={`Eliminar ${role.name}`}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <RoleForm
            key={editing?.id ?? 'new'}
            role={editing}
            onSaved={() => {
              setFormOpen(false)
              refetch()
            }}
            onClose={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
