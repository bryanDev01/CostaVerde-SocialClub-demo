import type { Activity } from './types'

export const ACTIVITY_PLACEHOLDER_IMAGES = [
  '/images/activity-piscina.svg',
  '/images/activity-tenis.svg',
  '/images/activity-billar.svg',
  '/images/activity-eventos.svg',
] as const

function hashIndex(id: string, length: number): number {
  let hash = 0
  for (let index = 0; index < id.length; index++) {
    hash = (hash + id.charCodeAt(index)) % length
  }
  return hash
}

export function resolveActivityImage(activity: Pick<Activity, 'id' | 'image_url'>): string {
  if (activity.image_url) return activity.image_url
  return ACTIVITY_PLACEHOLDER_IMAGES[
    hashIndex(activity.id, ACTIVITY_PLACEHOLDER_IMAGES.length)
  ]
}
