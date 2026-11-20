/**
 * Contenido estático de la página inicial.
 * Los textos e imágenes provienen de `lib/branding.ts` (marca configurable).
 *
 * Las imágenes y textos de marca provienen de `lib/branding.ts` (white-label);
 * las rutas apuntan a los archivos dentro de /public.
 */

import { BRAND } from './branding'

export interface PlaceItem {
  id: string
  name: string
  shortDescription: string
  longDescription: string
  image: string
  /** Every photo of the place, main photo first. */
  images?: string[]
  capacity: number
  location?: string
  schedule?: string
  features: string[]
  specificRules?: string
  requiresBooking?: boolean
}

export interface RuleItem {
  id: string
  title: string
  description: string
}

export const HOME_IMAGES = {
  main: BRAND.images.reception,
  entrance: BRAND.images.entrance,
} as const

export const CLUB_DESCRIPTION_SHORT = BRAND.copy.descriptionShort

export const CLUB_DESCRIPTION_LONG = BRAND.copy.descriptionLong

export const RULES: RuleItem[] = [
  {
    id: 'instalaciones',
    title: 'Respeta las instalaciones',
    description:
      'Cuida equipos, jardines y áreas deportivas. Reporta daños al personal.',
  },
  {
    id: 'humo',
    title: 'Prohibido fumar en áreas cerradas',
    description:
      'Se prohíbe fumar en lobby, restaurante, piscina y zonas infantiles.',
  },
  {
    id: 'menores',
    title: 'Menores de edad: supervisión obligatoria',
    description:
      'No se permite acceso sin adulto responsable en piscina, gimnasio y zonas de juego.',
  },
  {
    id: 'piscina',
    title: 'Higiene en piscinas',
    description:
      'Ducharse antes de entrar. No introducir alimentos, bebidas ni jabones.',
  },
  {
    id: 'gimnasio',
    title: 'Ropa deportiva en gimnasio',
    description:
      'Obligatorio usar ropa deportiva y calzado. Limpiar equipo tras usarlo.',
  },
  {
    id: 'aforo',
    title: 'Respetar aforos establecidos',
    description:
      'Piscina, playa y gimnasio tienen capacidad limitada. Respeta los límites.',
  },
  {
    id: 'alcohol',
    title: 'Consumo responsable de bebidas alcohólicas',
    description:
      'Solo en áreas autorizadas. Prohibido en piscina y zonas infantiles.',
  },
  {
    id: 'conducta',
    title: 'Conducta apropiada',
    description:
      'Mantén un comportamiento respetuoso. Evita acciones que afecten a otros visitantes.',
  },
]

export const FULL_RULES_NOTE =
  'El reglamento completo estará disponible próximamente en una página dedicada. Mientras tanto, consulta estas reglas principales y las normas específicas de cada servicio.'
