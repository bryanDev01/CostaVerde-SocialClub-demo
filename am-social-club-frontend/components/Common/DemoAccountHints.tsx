'use client'

import { KeyRound } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DemoAccountHintsProps {
  onPickEmail: (email: string) => void
  className?: string
}

const DEMO_PASSWORD = 'demo1234'

const DEMO_ACCOUNTS: { role: string; email: string; what: string }[] = [
  { role: 'Socio invitado', email: 'invitado1@demo.costaverde.cu', what: 'cuenta limpia para reservar a gusto' },
  { role: 'Socia invitada', email: 'invitada2@demo.costaverde.cu', what: 'cuenta limpia para reservar a gusto' },
  { role: 'Socio con carné', email: 'socio1@demo.costaverde.cu', what: 'reservas, acompañantes y QR' },
  { role: 'Pago pendiente', email: 'socio9@demo.costaverde.cu', what: 'muro de pago Transfermóvil' },
  { role: 'Administrador', email: 'administrador@clubcostaverde.cu', what: 'validar pagos y reportes' },
  { role: 'Recepción', email: 'recepcion@clubcostaverde.cu', what: 'check-in por QR y visitas' },
  { role: 'Recursos Humanos', email: 'rrhh@clubcostaverde.cu', what: 'precarga de empleados' },
]

/**
 * Demo-only credential hints shown on the login screen.
 * Renders nothing unless NEXT_PUBLIC_DEMO_HINTS=1 (portfolio demo builds).
 */
export function DemoAccountHints({ onPickEmail, className }: DemoAccountHintsProps) {
  if (process.env.NEXT_PUBLIC_DEMO_HINTS !== '1') return null

  return (
    <details
      className={cn(
        'mt-6 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4',
        className
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
        <KeyRound className="size-4" aria-hidden />
        Cuentas de la demo
        <span className="font-normal text-muted-foreground">
          (contraseña: {DEMO_PASSWORD})
        </span>
      </summary>
      <ul className="mt-3 space-y-1.5">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              onClick={() => onPickEmail(account.email)}
              className="w-full rounded-lg px-2 py-1.5 text-left text-sm leading-snug outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="font-medium text-foreground">{account.role}:</span>{' '}
              <span className="font-mono text-xs text-primary">{account.email}</span>{' '}
              <span className="text-xs text-muted-foreground">— {account.what}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Toca una cuenta para rellenar su correo. Todos los datos de esta demo son ficticios.
      </p>
    </details>
  )
}
