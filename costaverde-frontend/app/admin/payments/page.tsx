'use client'

import { CheckCircle2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/Common/EmptyState'
import { FormAlert } from '@/components/Common/FormAlert'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { PaymentTable } from '@/components/Admin/PaymentTable'
import { useAdminPendingPayments } from '@/lib/hooks'

export default function AdminPaymentsPage() {
  const { payments, loading, error, refetch } = useAdminPendingPayments()

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Pagos
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Validación de pagos
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Compara cada transacción con el SMS bancario de Transfermóvil
              antes de validar. Al validar, la suscripción del socio se activa
              automáticamente.
            </p>
          </div>
          {!loading && !error && payments.length > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-danger/20 bg-danger/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-danger">
              <span className="size-1.5 rounded-full bg-danger" aria-hidden />
              {payments.length} {payments.length === 1 ? 'pendiente' : 'pendientes'}
            </span>
          ) : null}
        </div>
      </header>

      <div className="mt-10">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((item) => (
              <SkeletonCard key={item} lines={2} />
            ))}
          </div>
        ) : error ? (
          <div className="space-y-5">
            <FormAlert>No se pudieron cargar los pagos: {error}</FormAlert>
            <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
              <RefreshCw className="size-4" aria-hidden />
              Reintentar
            </Button>
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Todo al día"
            description="No hay pagos pendientes de validación. Cuando un socio confirme su transacción con Transfermóvil · Pago en línea aparecerá aquí."
          />
        ) : (
          <PaymentTable payments={payments} onChanged={refetch} />
        )}
      </div>
    </div>
  )
}
