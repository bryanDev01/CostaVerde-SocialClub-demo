'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app] Render error:', error)
  }, [error])

  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="font-display text-xl font-semibold text-foreground">
          Algo no salió como esperábamos
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Esta pantalla no se pudo mostrar. Inténtalo de nuevo; si el problema continúa, avisa a administración.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button className="h-11" onClick={() => reset()}>
            Reintentar
          </Button>
          <Button variant="outline" className="h-11 bg-background" onClick={() => { window.location.href = '/' }}>
            Ir al inicio
          </Button>
        </div>
      </div>
    </div>
  )
}
