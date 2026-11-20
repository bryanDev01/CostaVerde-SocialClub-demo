'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/Common/StatusBadge'
import { formatShortDate } from '@/lib/dates'
import type { StaffAccount } from '@/lib/types'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  hr: 'Recursos Humanos',
  receptionist: 'Recepción',
}

export const staffRoleLabel = (roleName: string | null): string =>
  roleName ? (ROLE_LABELS[roleName] ?? roleName) : 'Sin rol'

interface StaffTableProps {
  accounts: StaffAccount[]
}

/** System accounts (admin, HR, reception, internal roles). Read-only here. */
export function StaffTable({ accounts }: StaffTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">CI</TableHead>
              <TableHead className="hidden sm:table-cell">Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden lg:table-cell">Registrado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium text-foreground">{account.name}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="font-mono text-sm tracking-wider text-foreground">{account.ci}</span>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                  {account.email ?? '—'}
                </TableCell>
                <TableCell className="text-sm text-foreground">{staffRoleLabel(account.role_name)}</TableCell>
                <TableCell>
                  <StatusBadge status={account.user_status} scope="user" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground">{formatShortDate(account.created_at)}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
