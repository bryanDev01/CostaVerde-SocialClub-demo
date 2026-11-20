'use client'

import { useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  /**
   * When provided, renders an acknowledgement checkbox that must be ticked
   * before the confirm button becomes available (for irreversible actions).
   */
  acknowledgement?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  acknowledgement,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  const confirmDisabled = loading || (Boolean(acknowledgement) && !acknowledged)

  const handleOpenChange = (next: boolean): void => {
    if (loading) return
    if (!next) setAcknowledged(false)
    onOpenChange(next)
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      setAcknowledged(false)
      onOpenChange(false)
    } catch {
      // El consumidor ya notifica el error; mantenemos el diálogo abierto.
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {description}
            </div>
          </DialogDescription>
        </DialogHeader>

        {acknowledgement ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-input accent-danger"
            />
            <span>{acknowledgement}</span>
          </label>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            className="h-11 bg-background"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'default'}
            className="h-11"
            onClick={handleConfirm}
            disabled={confirmDisabled}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Procesando...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
