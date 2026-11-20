'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface LogoutButtonProps {
  className?: string
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  return (
    <Button
      variant="ghost"
      className={cn('text-muted-foreground hover:text-foreground', className)}
      onClick={handleLogout}
    >
      <LogOut className="size-4" aria-hidden />
      Cerrar sesión
    </Button>
  )
}
