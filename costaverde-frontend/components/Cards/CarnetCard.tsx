'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Hash, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/Common/Logo'
import { resolveMediaUrl } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { cn, getInitials, membershipNumber } from '@/lib/utils'
import type { Subscription, UserProfile } from '@/lib/types'

const ACTIVE_STATUSES = ['active', 'external_active']

interface CarnetCardProps {
  user: UserProfile
  subscription: Subscription | null
  /** Canonical QR payload stored by the backend; guarantees validation matches. */
  serverQrData?: string | null
}

export function CarnetCard({ user, subscription, serverQrData }: CarnetCardProps) {
  const isValid = ACTIVE_STATUSES.includes(user.user_status)
  const memberCode = membershipNumber(user.id)

  const validityText = subscription?.expires_at
    ? `Válido hasta el ${formatDate(subscription.expires_at)}`
    : user.user_type === 'external'
      ? 'Acceso por visita'
      : 'Suscripción pendiente de activación'

  // Prefer the server's canonical payload so scans match the stored carnet row.
  const qrPayload =
    serverQrData ??
    JSON.stringify({
      user_id: user.id,
      ci: user.ci,
      name: user.name,
      user_type: user.user_type,
      expires_at: subscription?.expires_at ?? null,
    })

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-[1.75rem] p-6 text-white shadow-[0_30px_70px_-30px_rgba(53,224,124,0.75)] sm:p-8',
        isValid ? 'bg-primary' : 'bg-primary/80'
      )}
      aria-label={`Carnet digital de ${user.name}`}
    >
      <div aria-hidden className="dots-light absolute inset-0" />
      <div
        aria-hidden
        className="absolute -right-20 -top-24 size-64 rounded-full border border-white/10"
      />
      <div
        aria-hidden
        className="absolute -bottom-28 -left-16 size-56 rounded-full border border-white/10"
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <Logo variant="light" href={null} />
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
              isValid ? 'bg-white text-primary' : 'bg-danger text-danger-foreground'
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                isValid ? 'bg-danger' : 'bg-white'
              )}
              aria-hidden
            />
            {isValid ? 'Carnet activo' : 'Carnet inactivo'}
          </span>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {user.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto de perfil externa opcional
              <img
                src={resolveMediaUrl(user.profile_photo_url) ?? undefined}
                alt=""
                className="size-16 rounded-2xl border border-white/20 object-cover"
              />
            ) : (
              <span className="grid size-16 place-items-center rounded-2xl bg-white/15 font-display text-xl font-semibold text-white">
                {getInitials(user.name)}
              </span>
            )}
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
              Titular
            </p>
            <p className="mt-1.5 text-balance font-display text-2xl font-semibold leading-tight">
              {user.name}
            </p>
            <p className="mt-2 font-mono text-sm tracking-[0.18em] text-white/75">
              CI {user.ci}
            </p>
            <p className="mt-3 flex items-center gap-2 text-xs text-white/65">
              <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
              {validityText}
            </p>
          </div>

          <div className="shrink-0 self-center sm:self-auto">
            <div className="rounded-2xl bg-white p-3 shadow-lg">
              <QRCodeSVG
                value={qrPayload}
                size={132}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#0A1F12"
                aria-label="Código QR del carnet"
              />
            </div>
            <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-white/50">
              Presenta este QR
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/10 px-5 py-3.5">
          <span className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
            <Hash className="size-3.5 shrink-0" aria-hidden />
            N.º de socio
          </span>
          <span
            className="font-mono text-sm font-semibold tracking-[0.22em] text-white"
            aria-label={`Número de socio ${memberCode.replace(/-/g, ' guión ')}`}
          >
            {memberCode}
          </span>
        </div>
      </div>
    </article>
  )
}
