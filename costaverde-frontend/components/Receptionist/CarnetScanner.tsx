'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Camera, Loader2, ScanLine, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormAlert } from '@/components/Common/FormAlert'

const SCAN_INTERVAL_MS = 350

interface DetectedCode {
  rawValue: string
}

interface QrDetector {
  detect: (source: HTMLVideoElement) => Promise<DetectedCode[]>
}

type DetectorCtor = new (options?: { formats?: string[] }) => QrDetector

function getQrDetector(): QrDetector | null {
  const windowWithDetector = window as unknown as {
    BarcodeDetector?: DetectorCtor
  }
  if (!windowWithDetector.BarcodeDetector) return null
  try {
    return new windowWithDetector.BarcodeDetector({ formats: ['qr_code'] })
  } catch {
    return null
  }
}

function canUseCamera(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices
  )
}

interface CarnetScannerProps {
  onVerify: (qrPayload: string) => Promise<void>
  verifying: boolean
}

export function CarnetScanner({ onVerify, verifying }: CarnetScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<QrDetector | null>(null)
  const timerRef = useRef<number | null>(null)
  const lastPayloadRef = useRef<string | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraSupported, setCameraSupported] = useState<boolean | null>(null)
  const [manualPayload, setManualPayload] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => stopCamera, [stopCamera])

  const verifyPayload = useCallback(
    async (payload: string) => {
      const trimmed = payload.trim()
      if (!trimmed) return
      if (lastPayloadRef.current === trimmed) return
      lastPayloadRef.current = trimmed
      await onVerify(trimmed)
    },
    [onVerify]
  )

  useEffect(() => {
    if (!cameraActive || verifying) return

    let active = true

    const scan = () => {
      if (!active || !videoRef.current || !detectorRef.current) return
      detectorRef.current
        .detect(videoRef.current)
        .then((codes) => {
          if (!active || codes.length === 0 || !codes[0].rawValue) return
          void verifyPayload(codes[0].rawValue)
        })
        .catch(() => {
          // Frame not ready yet; keep scanning on the next tick.
        })
    }

    timerRef.current = window.setInterval(scan, SCAN_INTERVAL_MS)

    return () => {
      active = false
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [cameraActive, verifying, verifyPayload])

  const startCamera = async () => {
    setCameraError(null)
    if (!canUseCamera()) {
      setCameraSupported(false)
      setCameraError(
        'Tu navegador no permite acceder a la cámara. Usa la entrada manual del QR.'
      )
      return
    }

    const detector = getQrDetector()
    if (!detector) {
      setCameraSupported(false)
      setCameraError(
        'Este navegador no soporta lectura QR por cámara. Usa la entrada manual del QR.'
      )
      return
    }
    setCameraSupported(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      detectorRef.current = detector
      setCameraActive(true)
    } catch {
      setCameraError(
        'No se pudo acceder a la cámara. Verifica los permisos o usa la entrada manual del QR.'
      )
    }
  }

  const handleStopCamera = () => {
    stopCamera()
    setCameraActive(false)
  }

  const handleManualVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setManualError(null)
    if (!manualPayload.trim()) {
      setManualError('Pega el contenido del QR del carnet antes de verificar.')
      return
    }
    try {
      await onVerify(manualPayload.trim())
      setManualPayload('')
    } catch {
      setManualError('El QR no se pudo verificar. Inténtalo de nuevo.')
    }
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="escaneo-camara">
        <div className="flex items-center justify-between gap-4">
          <h2
            id="escaneo-camara"
            className="font-display text-lg font-semibold tracking-tight text-foreground"
          >
            Escaneo con cámara
          </h2>
          {cameraActive ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2 bg-background"
              onClick={handleStopCamera}
              disabled={verifying}
            >
              <X className="size-4" aria-hidden />
              Detener cámara
            </Button>
          ) : null}
        </div>

        {cameraError ? <FormAlert>{cameraError}</FormAlert> : null}

        {!cameraActive ? (
          <Button
            type="button"
            className="mt-4 h-12 gap-2.5"
            onClick={startCamera}
            disabled={verifying}
          >
            <Camera className="size-5" aria-hidden />
            Abrir cámara
          </Button>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-muted/40">
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="aspect-square w-full max-w-md object-cover"
            />
          </div>
        )}

        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <ScanLine className="mt-0.5 size-4 shrink-0" aria-hidden />
          {cameraSupported === false
            ? 'El QR se puede introducir manualmente en el campo de abajo cuando la cámara no esté disponible.'
            : 'Apunta al código QR del carnet de socios. Cuando se detecte, la verificación se hará automáticamente.'}
        </p>
      </section>

      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          o manualmente
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>

      <section aria-labelledby="entrada-manual">
        <h2
          id="entrada-manual"
          className="font-display text-lg font-semibold tracking-tight text-foreground"
        >
          Entrada manual
        </h2>

        <form onSubmit={handleManualVerify} className="mt-4 max-w-xl space-y-3" noValidate>
          <div className="space-y-2">
            <Label htmlFor="manual-qr" className="text-sm font-medium text-foreground">
              Contenido del QR del carnet
            </Label>
            <Input
              id="manual-qr"
              value={manualPayload}
              onChange={(event) => setManualPayload(event.target.value)}
              placeholder='{"user_id":"...","ci":"...","name":"...","user_type":"...","expires_at":"..."}'
              className="h-12 font-mono text-xs"
              disabled={verifying}
            />
          </div>
          {manualError ? <FormAlert>{manualError}</FormAlert> : null}
          <Button type="submit" className="h-11" disabled={verifying}>
            {verifying ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Verificando...
              </>
            ) : (
              <>
                <ScanLine className="size-4" aria-hidden />
                Verificar carnet
              </>
            )}
          </Button>
        </form>
      </section>
    </div>
  )
}