import { Suspense } from 'react'
import { PageLoader } from '@/components/Common/PageLoader'
import { NewReservationClient } from './NewReservationClient'

export default function NewReservationPage() {
  return (
    <Suspense
      fallback={
        <PageLoader
          fullScreen={false}
          className="min-h-[50vh] bg-transparent"
          title="Preparando el formulario"
          description="Un momento, estamos cargando las actividades..."
        />
      }
    >
      <NewReservationClient />
    </Suspense>
  )
}
