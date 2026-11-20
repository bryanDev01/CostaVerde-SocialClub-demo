'use client'

import Link from 'next/link'
import { useAuth } from '@/app/providers'
import { defaultRouteForUser } from '@/lib/staff'
import { Button } from '@/components/ui/button'

export function HeroCta() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div aria-hidden className="h-12 w-full max-w-xs animate-pulse rounded-lg bg-muted sm:w-72" />
  }

  if (user) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className="h-12 px-7 text-[15px]" asChild>
          <Link href="#actividades">Explorar servicios</Link>
        </Button>
        <Button size="lg" variant="outline" className="h-12 px-7 text-[15px]" asChild>
          <Link href={defaultRouteForUser(user)}>Mi panel</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button size="lg" variant="destructive" className="h-12 px-7 text-[15px]" asChild>
        <Link href="/login">Iniciar sesión para explorar</Link>
      </Button>
      <Button size="lg" variant="outline" className="h-12 bg-background px-7 text-[15px]" asChild>
        <Link href="/register">Crear cuenta</Link>
      </Button>
    </div>
  )
}
