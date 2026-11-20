import { Suspense } from 'react'
import { PageLoader } from '@/components/Common/PageLoader'
import { ConfirmPaymentClient } from './ConfirmPaymentClient'

export default function ConfirmPaymentPage() {
  return (
    <Suspense
      fallback={
        <PageLoader
          fullScreen={false}
          className="min-h-[40vh] bg-transparent"
          title="Cargando confirmación"
          description="Un momento, estamos preparando tu formulario..."
        />
      }
    >
      <ConfirmPaymentClient />
    </Suspense>
  )
}
