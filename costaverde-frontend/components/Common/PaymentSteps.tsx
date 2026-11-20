'use client'

import { usePathname } from 'next/navigation'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  label: string
  matches: (pathname: string) => boolean
}

const STEPS: Step[] = [
  { label: 'Elegir plan', matches: (pathname) => pathname === '/payment/required' },
  { label: 'Pagar', matches: (pathname) => pathname.startsWith('/payment/subscription') },
  { label: 'Confirmar', matches: (pathname) => pathname === '/payment/confirm' },
]

export function PaymentSteps() {
  const pathname = usePathname()
  const currentIndex = Math.max(
    0,
    STEPS.findIndex((step) => step.matches(pathname))
  )

  return (
    <ol className="flex items-center gap-3" aria-label="Pasos del pago">
      {STEPS.map((step, index) => {
        const isCurrent = index === currentIndex
        const isDone = index < currentIndex

        return (
          <li key={step.label} className="flex flex-1 items-center gap-3 last:flex-none">
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors',
                isCurrent && 'border-primary bg-primary text-primary-foreground',
                isDone && 'border-primary/20 bg-primary/10 text-primary',
                !isCurrent && !isDone && 'border-border bg-background text-muted-foreground'
              )}
              aria-hidden
            >
              {isDone ? <Check className="size-4" /> : index + 1}
            </span>
            <span
              className={cn(
                'whitespace-nowrap text-xs font-medium sm:text-sm',
                isCurrent ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 ? (
              <span
                className={cn(
                  'hidden h-px flex-1 sm:block',
                  isDone ? 'bg-primary/30' : 'bg-border'
                )}
                aria-hidden
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
