/**
 * Configuración central de marca (white-label) para todo el frontend.
 *
 * Cada valor lee una variable de entorno opcional `NEXT_PUBLIC_BRAND_*` y,
 * si no está definida, usa la marca por defecto. En esta demo el defecto es
 * la marca ficticia "Club Social Costa Verde".
 *
 * Para usar otra marca basta con definir las variables de entorno y colocar
 * los assets en /public — sin tocar código. Documentación: `.env.local.example`.
 */

const brandEnv = (key: string, fallback: string): string => {
  const value = process.env[key]
  return value && value.trim().length > 0 ? value.trim() : fallback
}

const DEFAULT_IMAGE_DIR = '/branding-demo'

/** How the primary logo image is fitted inside the square badge. */
export type LogoFit = 'zoom' | 'contain'

export interface BrandStat {
  value: string
  label: string
}

/**
 * NEXT_PUBLIC_BRAND_STATS format: "value=Label;value=Label;…"
 * e.g. "500=Aforo diario;18=Espacios"
 */
const parseStats = (raw: string): BrandStat[] =>
  raw
    .split(';')
    .map((entry) => {
      const [value, label] = entry.split('=')
      return { value: (value ?? '').trim(), label: (label ?? '').trim() }
    })
    .filter((stat) => stat.value.length > 0 && stat.label.length > 0)

const name = brandEnv('NEXT_PUBLIC_BRAND_NAME', 'Club Social Costa Verde')
const shortName = brandEnv('NEXT_PUBLIC_BRAND_SHORT_NAME', 'Costa Verde')
const city = brandEnv('NEXT_PUBLIC_BRAND_CITY', 'La Habana, Cuba')
const paymentMethodLabel = brandEnv(
  'NEXT_PUBLIC_BRAND_PAYMENT_LABEL',
  'Transfermóvil · Pago en línea'
)
const logoFit = brandEnv('NEXT_PUBLIC_BRAND_LOGO_FIT', 'contain')

export const BRAND = {
  name,
  shortName,
  city,
  address: brandEnv(
    'NEXT_PUBLIC_BRAND_ADDRESS',
    'Calle 10 #205, entre 1ra y 3ra, Playa'
  ),
  phone: brandEnv('NEXT_PUBLIC_BRAND_PHONE', '+53 55551010'),
  phoneAlt: brandEnv('NEXT_PUBLIC_BRAND_PHONE_ALT', '55452020'),
  schedule: brandEnv('NEXT_PUBLIC_BRAND_SCHEDULE', 'Lun a Dom · 8:00 am – 10:00 pm'),
  supportEmail: brandEnv('NEXT_PUBLIC_BRAND_EMAIL', 'contacto@clubcostaverde.cu'),
  hrEmail: brandEnv('NEXT_PUBLIC_BRAND_HR_EMAIL', 'rrhh@clubcostaverde.cu'),
  paymentMethodLabel,

  logos: {
    primary: brandEnv('NEXT_PUBLIC_BRAND_LOGO', `${DEFAULT_IMAGE_DIR}/logo-costa-verde.svg`),
    /** 'zoom' crops a photo-style logo to its center; 'contain' fits the whole image. */
    primaryFit: (logoFit === 'contain' ? 'contain' : 'zoom') as LogoFit,
    partner: brandEnv('NEXT_PUBLIC_BRAND_PARTNER_LOGO', `${DEFAULT_IMAGE_DIR}/logo-marina.svg`),
    partnerAlt: brandEnv('NEXT_PUBLIC_BRAND_PARTNER_LOGO_ALT', 'Logo Grupo Empresarial Marina'),
  },

  images: {
    reception: brandEnv('NEXT_PUBLIC_BRAND_IMG_RECEPTION', `${DEFAULT_IMAGE_DIR}/recepcion.svg`),
    entrance: brandEnv('NEXT_PUBLIC_BRAND_IMG_ENTRANCE', `${DEFAULT_IMAGE_DIR}/entrada.svg`),
    heroFlyer: brandEnv('NEXT_PUBLIC_BRAND_IMG_FLYER', `${DEFAULT_IMAGE_DIR}/flyer.svg`),
    heroMap: brandEnv('NEXT_PUBLIC_BRAND_IMG_MAP', `${DEFAULT_IMAGE_DIR}/mapa.svg`),
    heroMenu: brandEnv('NEXT_PUBLIC_BRAND_IMG_MENU', `${DEFAULT_IMAGE_DIR}/menu.svg`),
  },

  copy: {
    metadataTitle: brandEnv(
      'NEXT_PUBLIC_BRAND_META_TITLE',
      `${name} · Reservas y Eventos`
    ),
    metadataDescription: brandEnv(
      'NEXT_PUBLIC_BRAND_META_DESCRIPTION',
      `Reserva gastronomía, piscinas, deportes, eventos y más servicios del ${name}. Consulta el aforo en tiempo real, paga con ${paymentMethodLabel} y gestiona tu suscripción en línea.`
    ),
    heroSubtitle: brandEnv(
      'NEXT_PUBLIC_BRAND_HERO_SUBTITLE',
      `Un espacio pensado para el descanso y la convivencia de los trabajadores y sus familias: gastronomía cubana, piscinas, deportes, belleza y entretenimiento. Consulta el aforo en tiempo real, paga con ${paymentMethodLabel} y presenta tu carné digital.`
    ),
    descriptionShort: brandEnv(
      'NEXT_PUBLIC_BRAND_DESCRIPTION_SHORT',
      'Un espacio pensado para el descanso y la convivencia de los trabajadores y sus familias. Gastronomía cubana, piscinas, deportes, belleza y entretenimiento en un solo lugar.'
    ),
    descriptionLong: brandEnv(
      'NEXT_PUBLIC_BRAND_DESCRIPTION_LONG',
      `El ${name} concentra los servicios recreativos y gastronómicos del territorio en un entorno seguro y acogedor. Realiza tus reservas en línea, consulta el aforo en tiempo real y paga tu suscripción con ${paymentMethodLabel}, todo desde una misma cuenta.`
    ),
    footerBlurb: brandEnv(
      'NEXT_PUBLIC_BRAND_FOOTER_BLURB',
      'El club social de los empleados y sus familias. Reserva, paga y disfruta de piscina, deportes y eventos durante todo el año.'
    ),
    rulesTitle: brandEnv('NEXT_PUBLIC_BRAND_RULES_TITLE', 'Reglas del Club'),
  },

  stats: parseStats(
    brandEnv(
      'NEXT_PUBLIC_BRAND_STATS',
      '500=Aforo diario;18=Espacios;8=Reservables;4=Acompañantes'
    )
  ),
} as const
