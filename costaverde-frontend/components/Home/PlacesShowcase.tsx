'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MapPin, RefreshCw, Users } from 'lucide-react'
import { ActivityImageCarousel } from '@/components/Common/ActivityImageCarousel'
import { Button } from '@/components/ui/button'
import { SkeletonGrid } from '@/components/Common/SkeletonCard'
import { useActivities } from '@/lib/hooks'
import type { ActivityWithCategory } from '@/lib/types'
import type { PlaceItem } from '@/lib/homeContent'
import { PlaceDetailModal } from './PlaceDetailModal'

function shortText(text: string | null): string {
  if (!text) return 'Un espacio del club para disfrutar con la familia.'
  if (text.length <= 120) return text
  return `${text.slice(0, 117).trimEnd()}…`
}

/** Adapts a catalogue activity to the shape used by the home place modal. */
function toPlaceItem(activity: ActivityWithCategory): PlaceItem {
  const features: string[] = [activity.is_reservable ? 'Requiere reserva' : 'Acceso libre']
  if (activity.location) features.push(activity.location)
  if (activity.capacity > 0) features.push(`Aforo para ${activity.capacity} personas`)

  return {
    id: activity.id,
    name: activity.name,
    shortDescription: shortText(activity.description),
    longDescription:
      activity.description ?? 'Un espacio del club para disfrutar con la familia.',
    image: activity.images?.[0] ?? activity.image_url ?? '',
    images: activity.images ?? [],
    capacity: activity.capacity,
    location: activity.location ?? undefined,
    features,
    requiresBooking: activity.is_reservable,
  }
}

/**
 * Single, flat list of every place in the club. No category grouping: the
 * activities appear one after another in catalogue order (folder name), each
 * with a carousel holding every photo of its folder.
 */
export function PlacesShowcase({ className }: { className?: string }) {
  const { activities, loading, error, refetch } = useActivities()
  const [selected, setSelected] = useState<PlaceItem | null>(null)
  const [open, setOpen] = useState(false)

  const places = useMemo(
    () => activities.filter((activity) => activity.is_active),
    [activities]
  )

  const openDetails = (activity: ActivityWithCategory): void => {
    setSelected(toPlaceItem(activity))
    setOpen(true)
  }

  if (loading && places.length === 0) {
    return (
      <div className={className} aria-busy="true" aria-label="Cargando actividades">
        <SkeletonGrid count={6} />
      </div>
    )
  }

  if (error && places.length === 0) {
    return (
      <div
        className={`flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-10 text-center ${className ?? ''}`}
      >
        <p className="text-sm text-muted-foreground">
          No pudimos cargar las actividades del club.
        </p>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="size-4" aria-hidden />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className={className}>
      <p className="mb-6 text-sm text-muted-foreground">
        {places.length} espacios · ordenados por nombre
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {places.map((activity) => {
          const photos = activity.images?.length
            ? activity.images
            : activity.image_url
              ? [activity.image_url]
              : []

          return (
            <article
              key={activity.id}
              data-activity={activity.name}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(53,224,124,0.4)]"
            >
              <div className="relative aspect-4/3 overflow-hidden bg-muted">
                <ActivityImageCarousel
                  images={photos}
                  alt={activity.name}
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                />
                <span className="pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-sm">
                  {activity.is_reservable ? 'Con reserva' : 'Acceso libre'}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {activity.name}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {shortText(activity.description)}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5" aria-hidden />
                    {activity.capacity} personas
                  </span>
                  {activity.location ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden />
                      {activity.location}
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => openDetails(activity)}
                  aria-haspopup="dialog"
                  aria-label={`Ver detalles de ${activity.name}`}
                  className="mt-4 inline-flex items-center gap-1.5 self-start rounded-md text-sm font-semibold text-danger outline-none transition-colors hover:text-danger/80 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  Ver detalles
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        ¿Listo para reservar?{' '}
        <Link
          href="/activities"
          className="font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Ver todas las actividades
        </Link>
      </p>

      <PlaceDetailModal place={selected} open={open} onOpenChange={setOpen} />
    </div>
  )
}
