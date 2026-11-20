'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'

const SELECTION_ROUTE = '/hr/select-company'

/**
 * Forces an HR account to pick its company before using the HR panel.
 * Admin (global) and HR with a company pass through untouched.
 */
export function HrCompanyGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const needsCompany = user?.role_name === 'hr' && !user.company_id
  const isSelectionRoute = pathname === SELECTION_ROUTE

  useEffect(() => {
    if (needsCompany && !isSelectionRoute) {
      router.replace(SELECTION_ROUTE)
    }
  }, [needsCompany, isSelectionRoute, router])

  if (needsCompany && !isSelectionRoute) return null

  return <>{children}</>
}
