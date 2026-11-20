'use client'

import { useRouter } from 'next/navigation'
import { Clock, Info, LogIn, MapPin, ShieldCheck, Users } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { ActivityImageCarousel } from '@/components/Common/ActivityImageCarousel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PlaceItem } from '@/lib/homeContent'

interface PlaceDetailModalProps {
  place: PlaceItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PlaceDetailModal({
  place,
  open,
  onOpenChange,
}: PlaceDetailModalProps) {
  const router = useRouter()
  const { user, loading } = useAuth()

  if (!place) return null

  const handleReserve = (): void => {
    onOpenChange(false)
    router.push(
      user ? `/reservations/new?activity=${place.id}` : '/login'
    )
  }

  const photos = place.images?.length ? place.images : place.image ? [place.image] : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <div className="relative aspect-[16/8] w-full overflow-hidden rounded-t-2xl bg-muted">
          {photos.length > 0 ? (
            <ActivityImageCarousel images={photos} alt={place.name} sizes="(max-width: 768px) 100vw, 672px" />
          ) : null}
        </div>

        <div className="px-6 pb-6 sm:px-8">
          <DialogHeader>
            <DialogTitle>{place.name}</DialogTitle>
            <DialogDescription>{place.shortDescription}</DialogDescription>
          </DialogHeader>

          <p className="mt-4 text-sm leading-relaxed text-foreground/90">
            {place.longDescription}
          </p>

          <dl className="mt-6 grid gap-4 rounded-xl border border-border bg-muted/50 p-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Users
                className="mt-0.5 size-4.5 shrink-0 text-primary"
                aria-hidden
              />
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Aforo
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-foreground">
                  {place.capacity} personas
                </dd>
              </div>
            </div>

            {place.location ? (
              <div className="flex items-start gap-3">
                <MapPin
                  className="mt-0.5 size-4.5 shrink-0 text-primary"
                  aria-hidden
                />
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Ubicación
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">
                    {place.location}
                  </dd>
                </div>
              </div>
            ) : null}

            {place.schedule ? (
              <div className="flex items-start gap-3">
                <Clock
                  className="mt-0.5 size-4.5 shrink-0 text-primary"
                  aria-hidden
                />
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Horario
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">
                    {place.schedule}
                  </dd>
                </div>
              </div>
            ) : null}
          </dl>

          <div className="mt-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="size-4 text-danger" aria-hidden />
              Características
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {place.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {place.specificRules ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/5 p-4">
              <Info className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
              <p className="text-sm leading-relaxed text-foreground/90">
                <span className="font-semibold">Normas específicas: </span>
                {place.specificRules}
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            {place.requiresBooking ? (
              <Button type="button" onClick={handleReserve} disabled={loading}>
                {user ? (
                  'Reservar'
                ) : (
                  <>
                    <LogIn className="size-4" aria-hidden />
                    Iniciar sesión para reservar
                  </>
                )}
              </Button>
            ) : null}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
