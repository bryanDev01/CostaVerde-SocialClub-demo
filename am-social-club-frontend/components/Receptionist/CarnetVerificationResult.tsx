'use client'

import {
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  Hash,
  Mail,
  Users,
} from 'lucide-react'
import { StatusBadge } from '@/components/Common/StatusBadge'
import { cn } from '@/lib/utils'
import type { CarnetVerificationResult } from '@/lib/types'

interface CarnetVerificationResultProps {
  result: CarnetVerificationResult | null
}

export function CarnetVerificationResult({
  result,
}: CarnetVerificationResultProps) {
  if (!result) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Users className="size-6" aria-hidden />
        </span>
        <h3 className="mt-5 font-display text-lg font-semibold tracking-tight text-foreground">
          Esperando verificación
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Escanea el QR del carnet o péguelo manualmente. Aquí aparecerá el
          resultado del acceso.
        </p>
      </div>
    )
  }

  if (!result.valid) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-danger/20 bg-danger/5 p-6"
      >
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight text-danger">
              Acceso denegado
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-danger/90">
              {result.reason ?? 'El carnet no es válido.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { member, member_code, associates, today_reservations } = result

  if (!member) return null

  const userTypeLabel =
    member.user_type === 'corporate' ? 'Corporativo' : 'Externo'

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/20 bg-primary/5">
      <div className="flex items-start gap-4 border-b border-primary/20 p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold tracking-tight text-primary">
            Acceso validado
          </h3>
          <p className="truncate font-display text-2xl font-semibold tracking-tight text-foreground">
            {member.name}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              CI {member.ci}
            </span>
            <StatusBadge
              status={member.user_status}
              scope="user"
              className="border-primary/30 bg-transparent text-primary"
            />
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              {userTypeLabel}
            </span>
          </div>
        </div>
      </div>

      <dl className="grid gap-px border-b border-primary/10 bg-primary/10 sm:grid-cols-2">
        <div className="bg-primary/5 p-5">
          <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Mail className="size-4" aria-hidden />
            Correo
          </dt>
          <dd className="mt-1.5 truncate text-sm font-medium text-foreground">
            {member.email ?? 'Sin correo registrado'}
          </dd>
        </div>
        <div className="bg-primary/5 p-5">
          <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Hash className="size-4" aria-hidden />
            N.º de socio
          </dt>
          <dd className="mt-1.5 font-mono text-sm font-semibold tracking-[0.18em] text-foreground">
            {member_code ?? '—'}
          </dd>
        </div>
        {member.company_name ? (
          <div className="bg-primary/5 p-5 sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Empresa
            </dt>
            <dd className="mt-1.5 text-sm font-medium text-foreground">
              {member.company_name}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="grid gap-0 p-6 sm:grid-cols-2">
        <section className="pr-0 sm:pr-6">
          <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Users className="size-4" aria-hidden />
            Acompañantes
          </h4>
          {associates && associates.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {associates.map((associate) => (
                <li
                  key={associate.id}
                  className="rounded-lg border border-border bg-background px-3 py-2.5"
                >
                  <p className="truncate text-sm font-medium text-foreground">
                    {associate.name}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    CI {associate.ci}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Sin acompañantes registrados.
            </p>
          )}
        </section>

        <section className="border-t border-primary/10 pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden />
            Reservas de hoy
          </h4>
          {today_reservations && today_reservations.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {today_reservations.map((reservation) => (
                <li
                  key={reservation.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
                >
                  <span className="truncate text-sm font-medium text-foreground">
                    {reservation.activity_name ?? 'Actividad'}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {reservation.quantity}{' '}
                    {reservation.quantity === 1 ? 'persona' : 'personas'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Sin reservas activas hoy.
            </p>
          )}
        </section>
      </div>

      <p
        className={cn(
          'border-t border-primary/20 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]',
          today_reservations && today_reservations.length > 0
            ? 'text-primary'
            : 'text-muted-foreground'
        )}
      >
        {today_reservations && today_reservations.length > 0
          ? 'Entrada permitida: el socio tiene reservas activas para hoy.'
          : 'Verificación satisfactoria. El socio no tiene reservas activas para hoy.'}
      </p>
    </div>
  )
}