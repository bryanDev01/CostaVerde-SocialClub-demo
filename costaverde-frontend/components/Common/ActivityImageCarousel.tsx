'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActivityImageCarouselProps {
  images: string[]
  alt: string
  priority?: boolean
  sizes?: string
  className?: string
}

/**
 * Gallery for an activity: shows every photo of its folder and lets the user
 * move between them with the left and right arrows.
 */
export function ActivityImageCarousel({
  images,
  alt,
  priority = false,
  sizes,
  className,
}: ActivityImageCarouselProps) {
  const photos = images.filter(Boolean)
  const [index, setIndex] = useState(0)

  if (photos.length === 0) return null

  const current = Math.min(index, photos.length - 1)
  const hasMany = photos.length > 1

  const move = (direction: number) => {
    setIndex((value) => (value + direction + photos.length) % photos.length)
  }

  return (
    <div className={cn('group/carousel relative h-full w-full overflow-hidden', className)}>
      <Image
        src={photos[current]}
        alt={hasMany ? `${alt} (foto ${current + 1} de ${photos.length})` : alt}
        width={1200}
        height={800}
        unoptimized
        priority={priority}
        sizes={sizes}
        className="h-full w-full object-cover"
      />

      {hasMany ? (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-primary shadow-md outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Foto siguiente"
            className="absolute right-2 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-primary shadow-md outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
          <span className="absolute bottom-2 right-2 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
            {current + 1}/{photos.length}
          </span>
        </>
      ) : null}
    </div>
  )
}
