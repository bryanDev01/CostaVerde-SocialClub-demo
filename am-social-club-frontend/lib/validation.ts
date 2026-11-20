import { z } from 'zod'
import { MAX_ASSOCIATES } from './constants'

export const ciSchema = z
  .string()
  .regex(/^\d{11}$/, 'El CI debe tener exactamente 11 dígitos')

export const emailSchema = z
  .string()
  .min(1, 'El correo es obligatorio')
  .email('Ingresa un correo válido')

export const phoneSchema = z
  .string()
  .regex(/^[+]?[\d\s-]{7,15}$/, 'Ingresa un teléfono válido')
  .optional()
  .or(z.literal(''))

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

export const registerSchema = z
  .object({
    ci: ciSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })

export const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre es obligatorio')
    .max(120, 'El nombre es demasiado largo'),
  email: emailSchema,
  phone: phoneSchema,
})

export const associateSchema = z.object({
  ci: ciSchema,
  name: z.string().min(2, 'El nombre es obligatorio').max(120, 'El nombre es demasiado largo'),
  phone: phoneSchema,
  relation: z.enum(['spouse', 'son', 'daughter', 'parent', 'sibling', 'other'], {
    errorMap: () => ({ message: 'Selecciona el parentesco' }),
  }),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .optional()
    .or(z.literal('')),
})

export const reservationSchema = z.object({
  activity_id: z.string().min(1, 'Selecciona una actividad'),
  reservation_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha válida'),
  quantity: z.coerce
    .number({ invalid_type_error: 'Ingresa la cantidad de personas' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 persona')
    .max(MAX_ASSOCIATES + 1, `Máximo ${MAX_ASSOCIATES + 1} personas (tú + ${MAX_ASSOCIATES} acompañantes)`),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
})

export const paymentConfirmSchema = z.object({
  payment_id: z.string().min(1, 'Falta el identificador del pago'),
  transaction_number: z
    .string()
    .min(4, 'Ingresa el número de transacción completo')
    .max(40, 'El número de transacción es demasiado largo'),
})

export const employeeRowSchema = z.object({
  ci: ciSchema,
  name: z.string().min(2, 'Nombre requerido'),
  email: emailSchema,
})

export const externalUserSchema = z.object({
  ci: ciSchema,
  name: z
    .string()
    .min(2, 'El nombre es obligatorio')
    .max(120, 'El nombre es demasiado largo'),
  phone: phoneSchema,
})

export const activitySchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre es obligatorio')
    .max(120, 'El nombre es demasiado largo'),
  category_id: z.string().min(1, 'Selecciona una categoría'),
  capacity: z.coerce
    .number({ invalid_type_error: 'Ingresa una capacidad válida' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1')
    .max(10000, 'Máximo 10000'),
  location: z.string().max(120, 'Máximo 120 caracteres').optional().or(z.literal('')),
  description: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  image_url: z
    .string()
    .url('Ingresa una URL válida (https://...)')
    .optional()
    .or(z.literal('')),
  is_active: z.boolean().optional(),
})

export type ActivityFormValues = z.infer<typeof activitySchema>

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type ProfileFormValues = z.infer<typeof profileSchema>
export type AssociateFormValues = z.infer<typeof associateSchema>
export type ReservationFormValues = z.infer<typeof reservationSchema>
export type PaymentConfirmFormValues = z.infer<typeof paymentConfirmSchema>
export type ExternalUserFormValues = z.infer<typeof externalUserSchema>
