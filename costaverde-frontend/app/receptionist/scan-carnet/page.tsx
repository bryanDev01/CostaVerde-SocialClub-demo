'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { FormAlert } from '@/components/Common/FormAlert'
import { CarnetScanner } from '@/components/Receptionist/CarnetScanner'
import { CarnetVerificationResult } from '@/components/Receptionist/CarnetVerificationResult'
import { useCarnetVerification } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import type { CarnetVerificationResult as CarnetVerificationResultType } from '@/lib/types'

export default function ScanCarnetPage() {
  const { verifyCarnet } = useCarnetVerification()
  const [result, setResult] = useState<CarnetVerificationResultType | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const handleVerify = async (qrPayload: string) => {
    setResult(null)
    setVerifyError(null)
    setVerifying(true)
    try {
      const verification = await verifyCarnet(qrPayload)
      setResult(verification)
    } catch (error) {
      setVerifyError(describeApiError(error, 'No se pudo verificar el carnet'))
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Recepción
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Escanear carnet
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Verifica el QR del carnet de socios para validar el acceso de hoy.
          También se muestran sus acompañantes y reservas activas del día.
        </p>
      </header>

      {verifyError ? (
        <div className="mt-8 max-w-2xl">
          <FormAlert>{verifyError}</FormAlert>
        </div>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="escaner">
          <h2
            id="escaner"
            className="sr-only"
          >
            Escáner de carnet
          </h2>
          <CarnetScanner onVerify={handleVerify} verifying={verifying} />
        </section>

        <section aria-labelledby="resultado">
          <h2 id="resultado" className="sr-only">
            Resultado de la verificación
          </h2>
          {verifying ? (
            <div className="grid place-items-center rounded-2xl border border-border bg-card px-6 py-14 text-center">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              <p className="mt-4 text-sm text-muted-foreground">
                Verificando carnet...
              </p>
            </div>
          ) : (
            <CarnetVerificationResult result={result} />
          )}
        </section>
      </div>
    </div>
  )
}