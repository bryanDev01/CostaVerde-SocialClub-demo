'use client'

import { useState } from 'react'
import { Pencil, Plus, RefreshCw, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/app/providers'
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
import { FormField } from '@/components/Common/FormField'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import {
  useAdminRoles,
  useAdminStaff,
  useStaffMutations,
  type StaffInput,
} from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import { cn } from '@/lib/utils'
import type { StaffAccount } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
}

interface AccountFormProps {
  account: StaffAccount | null
  roleOptions: { id: string; name: string }[]
  onSaved: () => void
  onClose: () => void
}

function AccountForm({ account, roleOptions, onSaved, onClose }: AccountFormProps) {
  const isEditing = Boolean(account)
  const [name, setName] = useState(account?.name ?? '')
  const [ci, setCi] = useState(account?.ci ?? '')
  const [email, setEmail] = useState(account?.email ?? '')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState(account?.role_id ?? '')
  const [status, setStatus] = useState<'active' | 'inactive'>(
    account?.user_status === 'inactive' ? 'inactive' : 'active'
  )
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { createStaff, updateStaff } = useStaffMutations()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (isEditing && account) {
        await updateStaff(account.id, {
          role_id: roleId,
          user_status: status,
          password: newPassword || undefined,
        })
        toast.success('Cuenta actualizada')
      } else {
        const payload: StaffInput = { name, ci, email, password, role_id: roleId }
        await createStaff(payload)
        toast.success('Cuenta interna creada')
      }
      onSaved()
    } catch (err) {
      setError(describeApiError(err, 'No se pudo guardar la cuenta'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar cuenta interna' : 'Nueva cuenta interna'}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Cambia el rol o desactiva la cuenta. El acceso se valida contra la base de datos en cada petición.'
            : 'La cuenta se crea activa y puede iniciar sesión de inmediato con el rol asignado.'}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 space-y-4">
        {error ? <FormAlert>{error}</FormAlert> : null}

        {!isEditing ? (
          <>
            <FormField label="Nombre completo" htmlFor="staff-name">
              <Input
                id="staff-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={saving}
                required
              />
            </FormField>
            <FormField label="CI" htmlFor="staff-ci">
              <Input
                id="staff-ci"
                value={ci}
                onChange={(event) => setCi(event.target.value)}
                disabled={saving}
                required
              />
            </FormField>
            <FormField label="Correo" htmlFor="staff-email">
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={saving}
                required
              />
            </FormField>
            <FormField label="Contraseña" htmlFor="staff-password" hint="mínimo 8 caracteres">
              <Input
                id="staff-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={saving}
                autoComplete="new-password"
                required
              />
            </FormField>
          </>
        ) : null}

        <FormField label="Rol" htmlFor="staff-role">
          <Select value={roleId} onValueChange={setRoleId} disabled={saving}>
            <SelectTrigger id="staff-role" className="h-11">
              <SelectValue placeholder="Selecciona un rol" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {isEditing ? (
          <FormField
            label="Nueva contraseña"
            htmlFor="staff-password"
            hint="opcional, mínimo 8"
          >
            <Input
              id="staff-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={saving}
              autoComplete="new-password"
              placeholder="Dejar vacío para no cambiarla"
            />
          </FormField>
        ) : null}

        {isEditing ? (
          <FormField label="Estado" htmlFor="staff-status">
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as 'active' | 'inactive')}
              disabled={saving}
            >
              <SelectTrigger id="staff-status" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="inactive">Inactiva</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        ) : null}
      </div>

      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !roleId}>
          {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear cuenta'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function AdminStaffPage() {
  const { user } = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StaffAccount | null>(null)
  const { accounts, loading, error, refetch } = useAdminStaff()
  const { roles } = useAdminRoles()

  const roleOptions = (roles ?? [])
    .filter((role) => role.name !== 'user')
    .map((role) => ({ id: role.id, name: role.name }))

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (account: StaffAccount) => {
    setEditing(account)
    setFormOpen(true)
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Seguridad
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Cuentas internas
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Crea cuentas para recepción, RR. HH., administración o roles
          personalizados. Las cuentas de socio se gestionan desde el registro.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button onClick={openCreate} className="h-11">
          <Plus className="size-4" aria-hidden />
          Nueva cuenta
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
      ) : !accounts || accounts.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={UserCog}
          title="Sin cuentas internas"
          description="Crea la primera cuenta operativa y asígnale un rol."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Nueva cuenta
            </Button>
          }
        />
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>CI</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => {
                const isSelf = account.id === user?.id
                return (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {account.name}
                        {isSelf ? (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            Tu cuenta
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{account.ci}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {account.email ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{account.role_name}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          account.user_status === 'active'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {STATUS_LABELS[account.user_status] ?? account.user_status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {isSelf ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(account)}
                            aria-label={`Editar ${account.name}`}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <AccountForm
            key={editing?.id ?? 'new'}
            account={editing}
            roleOptions={roleOptions}
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
