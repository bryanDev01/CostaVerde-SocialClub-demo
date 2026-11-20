'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function ConnectionStatus() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()

    window.addEventListener('online', update)
    window.addEventListener('offline', update)

    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-danger px-4 py-2 text-center text-sm font-medium text-danger-foreground"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      Sin conexión a internet. Revisa tu red; algunas funciones no estarán disponibles.
    </div>
  )
}
