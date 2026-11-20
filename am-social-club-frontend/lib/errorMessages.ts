import { MAX_ASSOCIATES } from './constants'
import { CONNECTION_ERROR } from './api'

const CONNECTION_MESSAGES: ReadonlySet<string> = new Set(Object.values(CONNECTION_ERROR))

const API_ERROR_LABELS: Record<string, string> = {
  // Auth / Login
  'Email and password are required': 'Correo y contraseña son obligatorios.',
  'Invalid credentials': 'Correo o contraseña incorrectos.',
  'Account deactivated. Contact HR.': 'Tu cuenta fue desactivada. Contacta a Recursos Humanos.',
  'Account not activated. Complete registration first.':
    'Tu cuenta aún no está activada. Completa tu registro primero.',
  'Invalid or expired token': 'Tu sesión expiró. Inicia sesión de nuevo.',
  'Missing authorization token': 'Tu sesión expiró. Inicia sesión de nuevo.',
  'Authentication required': 'Inicia sesión para continuar.',
  'User no longer exists': 'Tu cuenta ya no existe. Contacta a administración.',
  'User profile not found': 'No encontramos tu perfil. Contacta a administración.',
  'Default role not configured': 'El sistema no está configurado correctamente.',
  'Insufficient permissions': 'No tienes permisos para realizar esta acción.',
  'Cannot change your own account status': 'No puedes cambiar el estado de tu propia cuenta.',
  'Staff account status cannot be changed here':
    'El estado de las cuentas del personal se gestiona en la sección Cuentas internas.',
  'Only administrators can activate accounts':
    'Solo un administrador puede activar cuentas.',
  'Staff accounts cannot make reservations':
    'Las cuentas de personal no pueden hacer reservas.',
  'External visitors do not have access':
    'Los visitantes externos no tienen acceso a la aplicación.',
  'Subscription plans are only for corporate members':
    'Los planes de suscripción son solo para socios de empresas.',

  // Register (RF-002)
  'Invalid CI format. Expected 11 digits.': 'El carnet de identidad debe tener 11 dígitos.',
  'Invalid email format': 'El correo no tiene un formato válido.',
  'Invalid phone format': 'El teléfono no tiene un formato válido.',
  'Password must be at least 8 characters': 'La contraseña debe tener al menos 8 caracteres.',
  'A user with this CI already exists': 'Ya existe una cuenta con ese carnet de identidad.',
  'A user with this email already exists': 'Ya existe una cuenta con ese correo.',
  'CI not found in employee preload. Contact HR.':
    'Tu carnet de identidad no aparece en la precarga. Contacta a Recursos Humanos.',
  'Email does not match the one registered by HR for this CI':
    'El correo no coincide con el registrado por Recursos Humanos para este carnet.',
  'This employee record is no longer pending activation':
    'Este registro de empleado ya no está pendiente de activación.',
  'Name is required': 'El nombre es obligatorio.',
  'Name cannot be empty': 'El nombre no puede estar vacío.',
  'Only admin or receptionist can create external users':
    'Solo un administrador o el recepcionista puede crear usuarios externos.',

  // Reservation affinity (RF-011)
  'activity_id is required': 'Debes seleccionar una actividad.',
  'quantity must be an integer >= 1': 'La cantidad debe ser un número entero mayor o igual a 1.',
  'Reservation date cannot be in the past': 'La fecha de reserva no puede ser anterior a hoy.',
  'Activity not found': 'No encontramos esta actividad.',
  'Activity is not active': 'Esta actividad no está disponible en este momento.',
  'User not found': 'No encontramos este usuario.',
  'Active subscription required to reserve':
    'Necesitas una suscripción activa para realizar reservas.',
  'Active subscription required': 'Necesitas una suscripción activa.',
  'Valid per-visit payment required': 'Se requiere un pago por visita válido.',
  'Subscription expires before the reservation date':
    'Tu suscripción vence antes de la fecha de reserva.',
  'Not enough capacity for this activity': 'No hay cupo disponible para esta actividad.',
  'Global daily capacity exceeded': 'Se alcanzó el aforo diario del club.',
  'Weekly reservation limit reached': 'Ya usaste tus 2 reservas de la semana.',
  'Reservation failed after maximum retries. Please try again.':
    'Hubo un problema al confirmar la reserva. Inténtalo de nuevo.',
  'Reservation status changed concurrently': 'El estado de la reserva cambió. Inténtalo de nuevo.',
  'Reservation not found': 'No encontramos esta reserva.',
  'Cannot view another user\'s reservation': 'No puedes consultar la reserva de otro usuario.',
  'Cannot cancel a reservation of another user': 'No puedes cancelar la reserva de otro usuario.',
  'Cannot confirm a reservation of another user': 'No puedes confirmar la asistencia de otro usuario.',
  'Reservation not found or not in confirmed status':
    'La reserva no existe o ya no está confirmada.',
  'Only admin or receptionist can mark no-show':
    'Solo un administrador o el recepcionista puede marcar una ausencia.',
  'User account is not active': 'Tu cuenta no está activa.',
  'External users cannot register associates':
    'Las cuentas externas no pueden registrar acompañantes.',

  // Payment & subscription (RF-006/007)
  'Transaction number is required': 'El número de transacción es obligatorio.',
  'Payment not found': 'No encontramos este pago.',
  'Cannot confirm a payment of another user': 'No puedes confirmar el pago de otro usuario.',
  'Cannot view another user\'s payment': 'No puedes consultar el pago de otro usuario.',
  'Payment validation failed': 'No se pudo validar el pago. Inténtalo de nuevo.',
  'Payment rejection failed': 'No se pudo rechazar el pago. Inténtalo de nuevo.',
  'Payment is already': 'Este pago ya fue procesado.',
  'Per-visit payments only apply to external users':
    'El pago por visita solo aplica a usuarios externos.',
  'Reservation belongs to another user': 'La reserva pertenece a otro usuario.',
  'Per-visit payment validation failed': 'No se pudo validar el pago por visita.',
  'A subscription payment is already pending validation':
    'Ya tienes un pago de suscripción en revisión.',
  'User already has an active subscription': 'Ya tienes una suscripción activa.',
  'Subscription not found': 'No encontramos esta suscripción.',
  'Subscription plan not found': 'No encontramos este plan de suscripción.',

  // Associates (RF-005)
  'Associate name is required': 'El nombre del acompañante es obligatorio.',
  'An associate with this CI already exists': 'Ya existe un acompañante con ese carnet.',
  'Cannot modify an associate of another user': 'No puedes modificar este acompañante.',
  'Cannot remove an associate of another user': 'No puedes eliminar este acompañante.',
  'Associate not found': 'No encontramos este acompañante.',
  'Titular user not found': 'No encontramos el titular de la cuenta.',

  // Activities (admin)
  'Activity name is required': 'El nombre de la actividad es obligatorio.',
  'Capacity must be a positive integer': 'La capacidad debe ser un número entero positivo.',
  'Activity category not found': 'La categoría seleccionada no existe.',

  // Employees / HR (RF-001)
  'Upload file must contain at least one employee row':
    'El archivo debe contener al menos una fila de empleado.',
  'Request body must contain a rows array': 'El archivo subido no tiene el formato esperado.',
  'HR user is not linked to a company': 'Tu cuenta no está vinculada a ninguna empresa.',
  'HR company not found': 'No encontramos la empresa de tu cuenta.',
  'HR can only access employees of their own company':
    'Solo puedes gestionar los empleados de tu empresa.',

  // Carnet (RF-013)
  'Invalid QR format': 'El código QR no tiene un formato válido.',
  'qr_payload is required and must be a string': 'El código QR es obligatorio.',

  // VIP (RF-017)
  'A VIP with this CI already exists': 'Ya existe un VIP con ese carnet de identidad.',
  'VIP not found': 'No encontramos este VIP.',
  'This VIP is inactive': 'Este VIP está inactivo.',
  'This VIP already registered an entry today':
    'Este VIP ya registró su entrada hoy.',
  'partners_count must be an integer between 0 and 50':
    'El número de acompañantes debe estar entre 0 y 50.',

  // Password recovery
  'Invalid or expired reset token':
    'El enlace de recuperación es inválido o venció. Solicita uno nuevo.',
  'token is required': 'El enlace de recuperación es inválido.',

  // Validation helpers
  'Invalid request body': 'La solicitud no es válida.',
  'Invalid query parameters': 'Los parámetros de la solicitud no son válidos.',
  'status is required': 'El estado es obligatorio.',
  'Invalid status': 'El estado no es válido',
  'Invalid user_type': 'El tipo de usuario no es válido',
  'Invalid date': 'La fecha no es válida',
  'Invalid date format': 'El formato de la fecha no es válido',

  // Security hardening (CSP, lockout, URLs)
  'Invalid image URL': 'La URL de la imagen no es válida.',
  'SVG images are not allowed': 'No se permiten imágenes SVG para actividades.',
  'Too many failed login attempts. Please try again later.':
    'Demasiados intentos de inicio de sesión fallidos. Espera unos minutos e inténtalo de nuevo.',
  'Too many authentication attempts, please try again later':
    'Demasiados intentos de autenticación. Inténtalo de nuevo más tarde.',

  // Network / connectivity (raw browser fetch errors)
  'Failed to fetch':
    'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  'NetworkError when attempting to fetch resource.':
    'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  'Load failed':
    'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  'Network request failed':
    'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  'The Internet connection appears to be offline.':
    'Sin conexión a internet. Revisa tu red e inténtalo de nuevo.',

  // Server-side failures
  'Internal server error':
    'Ocurrió un error en el servidor. Inténtalo de nuevo en unos minutos.',
  'Unknown error': 'Ocurrió un error inesperado. Inténtalo de nuevo.',
  'No data in response': 'La respuesta del servidor no es válida. Inténtalo de nuevo.',
}

const PREFIX_LABELS: Array<{ prefix: string; label: string }> = [
  {
    prefix: 'Maximum number of associates reached',
    label: `Alcanzaste el máximo de ${MAX_ASSOCIATES} acompañantes por titular.`,
  },
  {
    prefix: 'Capacity cannot be lower than current reserved count',
    label: 'La capacidad no puede ser menor que las plazas ya reservadas.',
  },
  {
    prefix: 'Cannot cancel reservation with status:',
    label: 'No se puede cancelar la reserva en su estado actual.',
  },
  {
    prefix: 'Invalid status:',
    label: 'El estado seleccionado no es válido.',
  },
  {
    prefix: 'Invalid user_type:',
    label: 'El tipo de usuario no es válido.',
  },
  {
    prefix: 'Invalid date format:',
    label: 'El formato de la fecha no es válido. Usa AAAA-MM-DD.',
  },
  {
    prefix: 'Invalid date:',
    label: 'La fecha ingresada no es válida.',
  },
  {
    prefix: 'Missing required fields:',
    label: 'Faltan campos obligatorios.',
  },
  {
    prefix: 'Row rejected:',
    label: 'Hay filas rechazadas en el archivo. Revísalas e inténtalo de nuevo.',
  },
  {
    prefix: 'Duplicate record:',
    label: 'Ya existe un registro con ese valor.',
  },
  {
    prefix: 'Referenced record does not exist',
    label: 'El registro relacionado no existe o está en uso.',
  },
  {
    prefix: 'Invalid data:',
    label: 'Hay un campo con un valor no válido.',
  },
  {
    prefix: 'Payment is already ',
    label: 'Este pago ya fue procesado.',
  },
]

export function translateErrorMessage(message: string | undefined, fallback: string): string {
  if (!message) return fallback

  const exact = API_ERROR_LABELS[message]
  if (exact) return exact

  // Already-friendly connection messages from lib/api.ts pass through unchanged.
  if (CONNECTION_MESSAGES.has(message)) return message

  const prefixMatch = PREFIX_LABELS.find(({ prefix }) => message.startsWith(prefix))
  if (prefixMatch) return prefixMatch.label

  // Unknown technical message: never show it to the user. Keep it in the console.
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[api] Unmapped error message:', message)
  }
  return fallback
}

export function describeApiError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return translateErrorMessage(error.message, fallback)
  }
  return fallback
}