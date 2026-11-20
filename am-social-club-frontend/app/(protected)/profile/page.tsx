'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, QrCode, RefreshCw, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/Common/ConfirmDialog'
import { EmptyState } from '@/components/Common/EmptyState'
import { FormAlert } from '@/components/Common/FormAlert'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { StatusBadge } from '@/components/Common/StatusBadge'
import { AssociateCard } from '@/components/Cards/AssociateCard'
import { AssociateForm } from '@/components/Forms/AssociateForm'
import { ProfileForm } from '@/components/Forms/ProfileForm'
import { useAuth } from '@/app/providers'
import { useAssociateActions, useAssociates, useSubscription } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import { formatDate } from '@/lib/dates'
import { MAX_ASSOCIATES } from '@/lib/constants'
import type { Associate, Subscription } from '@/lib/types'

function SubscriptionSummary({
  subscription,
  loading,
  userType,
}: {
  subscription: Subscription | null
  loading: boolean
  userType: string | undefined
}) {
  if (loading) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-muted" aria-hidden />
        <div className="h-6 w-2/3 animate-pulse rounded-full bg-muted" aria-hidden />
        <div className="h-3 w-3/4 animate-pulse rounded-full bg-muted" aria-hidden />
      </div>
    )
  }

  const isExternal = userType === 'external'

  if (isExternal && !subscription) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Acceso por visita
          </h3>
          <StatusBadge status="external_active" scope="user" />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Como visitante externo, pagas tu acceso por visita en la recepción
          del club. No necesitas suscripción mensual.
        </p>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
          Sin suscripción activa
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Activa tu plan para reservar actividades y obtener tu carnet digital.
        </p>
        <Button className="mt-4 h-11 w-full" asChild>
          <Link href="/payment/required">Elegir un plan</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
          Mi suscripción
        </h3>
        <StatusBadge status={subscription.status} scope="subscription" />
      </div>

      <p className="mt-4 font-display text-2xl font-semibold tracking-tight text-primary">
        ${subscription.price_paid}
        <span className="ml-1 text-sm font-normal text-muted-foreground">CUP</span>
      </p>

      {subscription.expires_at ? (
        <p className="mt-1.5 text-sm text-muted-foreground">
          {subscription.status === 'validated' ? 'Vence el' : 'Vencía el'}{' '}
          {formatDate(subscription.expires_at)}
        </p>
      ) : null}

      {subscription.status === 'pending_validation' ? (
        <p className="mt-4 rounded-xl border border-border bg-muted/50 p-3.5 text-xs leading-relaxed text-muted-foreground">
          Tu pago está en revisión. Un administrador lo validará en menos de
          24 horas.
        </p>
      ) : null}

      {subscription.is_grace_period ? (
        <p className="mt-4 rounded-xl border border-danger/20 bg-danger/5 p-3.5 text-xs leading-relaxed text-danger">
          Estás en período de gracia: regulariza tu pago antes del día 6 para
          evitar la suspensión de tu cuenta.
        </p>
      ) : null}

      {subscription.status === 'expired' || subscription.status === 'rejected' ? (
        <Button className="mt-4 h-11 w-full" asChild>
          <Link href="/payment/required">Renovar suscripción</Link>
        </Button>
      ) : null}
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { associates, loading, error, refetch } = useAssociates()
  const { subscription, loading: subscriptionLoading } = useSubscription()
  const { deleteAssociate } = useAssociateActions()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAssociate, setEditingAssociate] = useState<Associate | null>(null)
  const [deletingAssociate, setDeletingAssociate] = useState<Associate | null>(null)

  const isExternal = user?.user_type === 'external'
  const reachedLimit = associates.length >= MAX_ASSOCIATES
  const canAddAssociate = !isExternal && !reachedLimit

  const openCreateDialog = () => {
    setEditingAssociate(null)
    setDialogOpen(true)
  }

  const openEditDialog = (associate: Associate) => {
    setEditingAssociate(associate)
    setDialogOpen(true)
  }

  const handleSaved = () => {
    setDialogOpen(false)
    setEditingAssociate(null)
    refetch()
  }

  const handleDelete = async () => {
    if (!deletingAssociate) return
    try {
      await deleteAssociate(deletingAssociate.id)
      toast.success('Acompañante eliminado.')
      setDeletingAssociate(null)
      refetch()
    } catch (err) {
      toast.error(
        describeApiError(err, 'No se pudo eliminar el acompañante')
      )
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Mi perfil
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Tu cuenta y tus acompañantes
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          Actualiza tus datos de contacto, consulta el estado de tu suscripción
          y gestiona hasta {MAX_ASSOCIATES} familiares que pueden disfrutar del
          club contigo.
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="animate-fade-up motion-reduce:animate-none">
          <ProfileForm />
        </div>

        <div
          className="space-y-6 animate-fade-up motion-reduce:animate-none"
          style={{ animationDelay: '80ms' }}
        >
          <SubscriptionSummary
            subscription={subscription}
            loading={subscriptionLoading}
            userType={user?.user_type}
          />

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <QrCode className="size-5" aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-foreground">
              Carnet digital
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Tu identificación del club con código QR. Preséntala en la
              entrada para acceder con tus acompañantes.
            </p>
            <Button variant="outline" className="mt-4 h-11 w-full bg-background" asChild>
              <Link href="/profile/carnet">Ver mi carnet</Link>
            </Button>
          </div>
        </div>
      </div>

      <section
        aria-labelledby="acompanantes"
        className="mt-12 animate-fade-up motion-reduce:animate-none"
        style={{ animationDelay: '140ms' }}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="acompanantes"
              className="font-display text-2xl font-semibold tracking-tight text-foreground"
            >
              Mis acompañantes
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {associates.length} de {MAX_ASSOCIATES} familiares registrados.
              Disfrutan del club incluidos en tu suscripción.
            </p>
          </div>
          <Button
            className="h-11"
            onClick={openCreateDialog}
            disabled={!canAddAssociate}
            title={
              isExternal
                ? 'Las cuentas externas no pueden registrar acompañantes'
                : reachedLimit
                  ? `Alcanzaste el máximo de ${MAX_ASSOCIATES} acompañantes`
                  : undefined
            }
          >
            <UserPlus className="size-4" aria-hidden />
            Agregar acompañante
          </Button>
        </div>

        <div className="mt-7">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((item) => (
                <SkeletonCard key={item} lines={2} />
              ))}
            </div>
          ) : error ? (
            <div className="space-y-5">
              <FormAlert>No se pudieron cargar tus acompañantes: {error}</FormAlert>
              <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
                <RefreshCw className="size-4" aria-hidden />
                Reintentar
              </Button>
            </div>
          ) : associates.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aún no tienes acompañantes"
              description={
                isExternal
                  ? 'Las cuentas externas acceden por visita y no incluyen acompañantes registrados.'
                  : `Registra hasta ${MAX_ASSOCIATES} familiares para que disfruten del club contigo.`
              }
              action={
                canAddAssociate ? (
                  <Button className="h-11" onClick={openCreateDialog}>
                    <UserPlus className="size-4" aria-hidden />
                    Agregar acompañante
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {associates.map((associate) => (
                <AssociateCard
                  key={associate.id}
                  associate={associate}
                  onEdit={() => openEditDialog(associate)}
                  onDelete={() => setDeletingAssociate(associate)}
                />
              ))}
            </div>
          )}

          {!loading && !error && canAddAssociate && associates.length > 0 ? (
            <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="size-3.5 shrink-0" aria-hidden />
              Puedes seguir agregando familiares: te quedan{' '}
              {MAX_ASSOCIATES - associates.length} cupos.
            </p>
          ) : null}
        </div>
      </section>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingAssociate(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAssociate ? 'Editar acompañante' : 'Agregar acompañante'}
            </DialogTitle>
            <DialogDescription>
              {editingAssociate
                ? 'Actualiza los datos de tu familiar. El CI no se puede modificar.'
                : 'Registra un familiar que te acompañará al club. El CI debe ser único en el sistema.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5">
            <AssociateForm
              associate={editingAssociate}
              onSuccess={handleSaved}
              onCancel={() => {
                setDialogOpen(false)
                setEditingAssociate(null)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingAssociate !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingAssociate(null)
        }}
        title="¿Eliminar este acompañante?"
        description={
          deletingAssociate
            ? `Se eliminará a ${deletingAssociate.name} de tu lista de acompañantes. Podrás volver a registrarlo más adelante.`
            : ''
        }
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  )
}
