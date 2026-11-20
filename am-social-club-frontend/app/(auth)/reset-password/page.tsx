import { Suspense } from 'react'
import { PageLoader } from '@/components/Common/PageLoader'
import { ResetPasswordClient } from './ResetPasswordClient'

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <PageLoader
          fullScreen={false}
          className="min-h-[40vh] bg-transparent"
          title="Cargando"
          description="Preparando el formulario de recuperación..."
        />
      }
    >
      <ResetPasswordClient />
    </Suspense>
  )
}
