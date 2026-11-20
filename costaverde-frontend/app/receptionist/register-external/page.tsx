'use client'

import { WalkInForm } from '@/components/Forms/WalkInForm'

export default function RegisterExternalPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Recepción
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Registrar visitante (walk-in)
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Registra visitantes que llegan sin cita. El sistema buscará
          automáticamente por CI para evitar duplicados.
        </p>
      </header>

      <div className="mt-10">
        <WalkInForm />
      </div>
    </div>
  )
}