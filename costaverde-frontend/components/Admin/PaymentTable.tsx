'use client'

import { useState } from 'react'
import { CheckCircle2, Hourglass, XCircle } from 'lucide-react'
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
import { useAdminActions } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import { formatDateTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { PaymentWithUser } from '@/lib/types'

type PendingAction = 'validate' | 'reject'

interface PaymentTableProps {
  payments: PaymentWithUser[]
  onChanged: () => void
}

export function PaymentTable({ payments, onChanged }: PaymentTableProps) {
  const { validatePayment, rejectPayment } = useAdminActions()
  const [target, setTarget] = useState<{ payment: PaymentWithUser; action: PendingAction } | null>(null)

  const handleConfirm = async () => {
    if (!target) return

    try {
      if (target.action === 'validate') {
        await validatePayment(target.payment.id)
        toast.success(`Pago de ${target.payment.user_name} validado. Suscripción activada.`)
      } else {
        await rejectPayment(target.payment.id)
        toast.success(
          `Pago de ${target.payment.user_name} rechazado. Si el usuario ya transferió, gestiona el reembolso fuera de la plataforma.`
        )
      }

      setTarget(null)
      onChanged()
    } catch (error) {
      toast.error(
        describeApiError(error, 'No se pudo procesar el pago')
      )
      throw error
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Usuario</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead className="hidden md:table-cell">Referencia</TableHead>
              <TableHead className="hidden lg:table-cell">Transacción</TableHead>
              <TableHead className="hidden sm:table-cell">Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => {
              const hasTransaction = Boolean(payment.transaction_number)
              return (
                <TableRow key={payment.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">{payment.user_name}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      CI {payment.user_ci}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-foreground">
                      ${payment.amount_cup}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">CUP</span>
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                      {payment.payment_type === 'subscription' ? 'Suscripción' : 'Por visita'}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="font-mono text-sm tracking-wider text-foreground">
                      {payment.reference_code}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {hasTransaction ? (
                      <span className="font-mono text-sm text-foreground">
                        {payment.transaction_number}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        <Hourglass className="size-3" aria-hidden />
                        Sin confirmar
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(payment.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        className={cn('h-9', !hasTransaction && 'opacity-50')}
                        disabled={!hasTransaction}
                        title={
                          hasTransaction
                            ? 'Validar pago'
                            : 'El usuario aún no confirma el número de transacción'
                        }
                        onClick={() => setTarget({ payment, action: 'validate' })}
                      >
                        <CheckCircle2 className="size-3.5" aria-hidden />
                        Validar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 border-danger/30 bg-background text-danger hover:bg-danger/10 hover:text-danger"
                        onClick={() => setTarget({ payment, action: 'reject' })}
                      >
                        <XCircle className="size-3.5" aria-hidden />
                        Rechazar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
        title={target?.action === 'validate' ? '¿Validar este pago?' : '¿Rechazar este pago?'}
        description={
          target ? (
            target.action === 'validate' ? (
              `Confirmas la transacción ${target.payment.transaction_number ?? ''} de ${target.payment.user_name} por $${target.payment.amount_cup} CUP. La suscripción se activará de inmediato.`
            ) : (
              <div className="space-y-3">
                <p>
                  Se rechazará el pago de{' '}
                  <span className="font-semibold text-foreground">
                    {target.payment.user_name}
                  </span>{' '}
                  por{' '}
                  <span className="font-semibold text-foreground">
                    ${target.payment.amount_cup} CUP
                  </span>
                  .
                </p>

                <div className="rounded-xl border border-danger/30 bg-danger/5 p-3.5">
                  <p className="font-semibold text-danger">
                    Antes de continuar, ten en cuenta:
                  </p>
                  <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-foreground/90">
                    <li>
                      Si el usuario ya realizó la transferencia,{' '}
                      <span className="font-semibold">
                        el dinero no puede devolverse desde la plataforma
                      </span>
                      : el reembolso solo puede gestionarse fuera de la app
                      (Transfermóvil o entidad bancaria).
                    </li>
                    <li>
                      Verifica primero el SMS bancario o el estado de cuenta con
                      el número de transacción antes de rechazar.
                    </li>
                    <li>
                      Esta acción no se puede deshacer: la suscripción quedará
                      rechazada y el usuario deberá iniciar un nuevo pago.
                    </li>
                  </ul>
                </div>
              </div>
            )
          ) : (
            ''
          )
        }
        acknowledgement={
          target?.action === 'reject'
            ? 'Entiendo que el dinero transferido no se puede devolver desde la plataforma y que debo verificar el pago antes de rechazarlo.'
            : undefined
        }
        confirmLabel={target?.action === 'validate' ? 'Sí, validar pago' : 'Sí, rechazar pago'}
        cancelLabel="Cancelar"
        variant={target?.action === 'reject' ? 'danger' : 'default'}
        onConfirm={handleConfirm}
      />
    </>
  )
}
