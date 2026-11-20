'use client'

import Link from 'next/link'
import { AlertTriangle, Printer, QrCode, ScanLine, ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/Common/EmptyState'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { CarnetCard } from '@/components/Cards/CarnetCard'
import { useAuth } from '@/app/providers'
import { useAssociates, useMyCarnet, useSubscription } from '@/lib/hooks'
import { FAMILY_RELATIONS, MAX_ASSOCIATES } from '@/lib/constants'
import type { Associate } from '@/lib/types'

function AssociateRow({ associate }: { associate: Associate }) {
  const relationLabel =
    FAMILY_RELATIONS.find((relation) => relation.value === associate.relation)?.label ??
    associate.relation

  return (
    <li className="flex items-center justify-between gap-4 border-b border-border py-3.5 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {associate.name}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {relationLabel} · CI{' '}
          <span className="font-mono tracking-wider">{associate.ci}</span>
        </p>
      </div>
      <span className="inline-flex shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
        Autorizado
      </span>
    </li>
  )
}

export default function CarnetPage() {
  const { user } = useAuth()
  const { subscription, loading: subscriptionLoading } = useSubscription()
  const { associates, loading: associatesLoading } = useAssociates()
  // Fetching the canonical carnet auto-creates the DB row so scanned QRs validate.
  const { carnet, loading: carnetLoading } = useMyCarnet()

  if (!user) return null

  const isActive = ['active', 'external_active'].includes(user.user_status)
  const hasGraceWarning = subscription?.is_grace_period === true

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Mi carnet
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Carnet digital de socio
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Presenta este código QR en la entrada del club. La recepción
              escaneará tu carnet para registrar tu acceso y el de tus
              acompañantes.
            </p>
          </div>
          <Button
            variant="outline"
            className="h-11 bg-background"
            onClick={() => window.print()}
          >
            <Printer className="size-4" aria-hidden />
            Imprimir carnet
          </Button>
        </div>

        {!isActive ? (
          <div className="mt-7 flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger/5 p-5">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-danger">
                Tu carnet aún no está activo
              </p>
              <p className="mt-1 text-sm leading-relaxed text-danger/90">
                Activa tu suscripción para que el carnet sea válido en la
                entrada. Mientras tanto, puedes mostrarlo solo como referencia.
              </p>
            </div>
          </div>
        ) : null}

        {hasGraceWarning ? (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger/5 p-5">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-danger">
                Estás en período de gracia
              </p>
              <p className="mt-1 text-sm leading-relaxed text-danger/90">
                Tu suscripción venció. Regulariza tu pago antes del día 6 para
                mantener el acceso al club.
              </p>
            </div>
          </div>
        ) : null}
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="animate-fade-up motion-reduce:animate-none">
          {subscriptionLoading || carnetLoading ? (
            <SkeletonCard className="min-h-72" lines={3} />
          ) : (
            <CarnetCard
              user={user}
              subscription={subscription}
              serverQrData={carnet?.qr_code_data ?? null}
            />
          )}

          <section
            aria-labelledby="acompanantes-carnet"
            className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm print:mt-6 print:border-0 print:shadow-none"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="acompanantes-carnet"
                className="font-display text-lg font-semibold tracking-tight text-foreground"
              >
                Acompañantes autorizados
              </h2>
              {associates.length > 0 ? (
                <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {associates.length} de {MAX_ASSOCIATES}
                </span>
              ) : null}
            </div>

            {associatesLoading ? (
              <div className="mt-4 space-y-3">
                {[0, 1].map((item) => (
                  <div
                    key={item}
                    className="h-10 animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
                    aria-hidden
                  />
                ))}
              </div>
            ) : associates.length === 0 ? (
              <div className="mt-2">
                <EmptyState
                  icon={Users}
                  title="Sin acompañantes registrados"
                  description="Puedes registrar hasta 4 familiares desde tu perfil para que accedan al club contigo."
                  action={
                    <Button variant="outline" className="h-11 bg-background print:hidden" asChild>
                      <Link href="/profile">Gestionar acompañantes</Link>
                    </Button>
                  }
                  className="border-none bg-transparent py-8"
                />
              </div>
            ) : (
              <ul className="mt-3">
                {associates.map((associate) => (
                  <AssociateRow key={associate.id} associate={associate} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start print:hidden">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <ScanLine className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold tracking-tight text-foreground">
              Cómo usarlo
            </h2>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  1
                </span>
                Muestra el QR en la entrada; recepción lo escaneará.
              </li>
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  2
                </span>
                El sistema verificará tu estado y tus acompañantes del día.
              </li>
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  3
                </span>
                También puedes imprimirlo o guardarlo en tu teléfono.
              </li>
            </ol>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold tracking-tight text-foreground">
              Validez
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              El carnet es válido mientras tu suscripción esté activa. Si
              vence, entrarás en período de gracia de 5 días antes de la
              suspensión.
            </p>
            <Button variant="outline" className="mt-4 h-11 w-full bg-background" asChild>
              <Link href="/profile">
                <QrCode className="size-4" aria-hidden />
                Ver estado de mi cuenta
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
