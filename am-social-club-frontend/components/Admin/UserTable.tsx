'use client'

import { useState } from 'react'
import { UserCheck, UserX, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/Common/ConfirmDialog'
import { StatusBadge } from '@/components/Common/StatusBadge'
import { useAuth } from '@/app/providers'
import { useAdminActions } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import { formatDate } from '@/lib/dates'
import type { User, UserStatus } from '@/lib/types'

type UserAction = 'activate' | 'suspend' | 'deactivate'

const ACTION_LABELS: Record<UserAction, string> = {
  activate: 'Activar cuenta',
  suspend: 'Suspender cuenta',
  deactivate: 'Desactivar cuenta',
}

interface UserTableProps {
  users: User[]
  onChanged: () => void
}

export function UserTable({ users, onChanged }: UserTableProps) {
  const { updateUserStatus } = useAdminActions()
  const { user: currentUser } = useAuth()
  // Activation bypasses payment validation, so only the admin role may do it.
  const canActivate = currentUser?.role_name === 'admin'
  const [target, setTarget] = useState<{ user: User; action: UserAction } | null>(null)

  const handleConfirm = async () => {
    if (!target) return

    const nextStatus: UserStatus =
      target.action === 'activate'
        ? target.user.user_type === 'external'
          ? 'external_active'
          : 'active'
        : target.action === 'suspend'
          ? 'suspended'
          : 'inactive'

    try {
      await updateUserStatus(target.user.id, nextStatus)
      toast.success(
        `${target.user.name}: ${ACTION_LABELS[target.action].toLowerCase()} completada.`
      )
      setTarget(null)
      onChanged()
    } catch (error) {
      toast.error(
        describeApiError(error, 'No se pudo actualizar el usuario')
      )
      throw error
    }
  }

  const isActive = (user: User) =>
    user.user_status === 'active' || user.user_status === 'external_active'

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Usuario</TableHead>
              <TableHead className="hidden md:table-cell">CI</TableHead>
              <TableHead className="hidden sm:table-cell">Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden lg:table-cell">Registrado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {user.email ?? 'Sin correo'}
                  </p>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="font-mono text-sm tracking-wider text-foreground">
                    {user.ci}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {user.user_type === 'corporate' ? 'Corporativo' : 'Externo'}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={user.user_status} scope="user" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {isActive(user) ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 bg-background"
                          onClick={() => setTarget({ user, action: 'suspend' })}
                        >
                          <Ban className="size-3.5" aria-hidden />
                          Suspender
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                          onClick={() => setTarget({ user, action: 'deactivate' })}
                        >
                          <UserX className="size-3.5" aria-hidden />
                          Desactivar
                        </Button>
                      </>
                    ) : canActivate ? (
                      <Button
                        size="sm"
                        className="h-9"
                        onClick={() => setTarget({ user, action: 'activate' })}
                      >
                        <UserCheck className="size-3.5" aria-hidden />
                        Activar
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Solo administración
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
        title={target ? ACTION_LABELS[target.action] : ''}
        description={
          target
            ? target.action === 'activate'
              ? `Se activará manualmente la cuenta de ${target.user.name} (${target.user.ci}). Podrá reservar de inmediato.`
              : target.action === 'suspend'
                ? `Se suspenderá la cuenta de ${target.user.name} (${target.user.ci}). No podrá iniciar sesión ni reservar hasta que se reactive.`
                : `Se desactivará la cuenta de ${target.user.name} (${target.user.ci}). Úsalo solo cuando el usuario deje de pertenecer al club.`
            : ''
        }
        confirmLabel={target?.action === 'activate' ? 'Sí, activar' : 'Sí, continuar'}
        cancelLabel="Cancelar"
        variant={target?.action === 'activate' ? 'default' : 'danger'}
        onConfirm={handleConfirm}
      />
    </>
  )
}
