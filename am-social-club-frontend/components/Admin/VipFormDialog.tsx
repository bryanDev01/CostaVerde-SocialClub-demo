'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormField } from '@/components/Common/FormField'
import { useVipActions } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import type { VipUser } from '@/lib/types'

interface VipFormProps {
  vip: VipUser | null
  onSaved: () => void
  onClose: () => void
}

function VipForm({ vip, onSaved, onClose }: VipFormProps) {
  const [name, setName] = useState(vip?.name ?? '')
  const [ci, setCi] = useState(vip?.ci ?? '')
  const [partners, setPartners] = useState(String(vip?.partners_count ?? 0))
  const [isActive, setIsActive] = useState(vip?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { createVip, updateVip } = useVipActions()

  const isEditing = Boolean(vip)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (ci.length !== 11 || !/^\d+$/.test(ci)) {
      setError('El CI debe tener 11 dígitos')
      return
    }
    const partnersValue = Number(partners)
    if (!Number.isInteger(partnersValue) || partnersValue < 0) {
      setError('El número de acompañantes debe ser 0 o mayor')
      return
    }

    setSaving(true)
    try {
      if (vip) {
        await updateVip(vip.id, {
          name: name.trim(),
          ci,
          partners_count: partnersValue,
          is_active: isActive,
        })
        toast.success('VIP actualizado')
      } else {
        await createVip({ name: name.trim(), ci, partners_count: partnersValue })
        toast.success('VIP creado')
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(describeApiError(err, 'No se pudo guardar el VIP'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar VIP' : 'Nuevo VIP'}</DialogTitle>
        <DialogDescription>
          Registra el nombre, el carnet de identidad y cuántos acompañantes
          vienen con el VIP. Recepción verificará la identidad al llegar.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}

        <FormField label="Nombre" htmlFor="vip-name">
          <Input
            id="vip-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre del VIP"
            className="h-11"
            autoFocus
            disabled={saving}
            required
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Carnet de identidad" htmlFor="vip-ci" hint="11 dígitos">
            <Input
              id="vip-ci"
              value={ci}
              onChange={(event) => setCi(event.target.value.replace(/\D/g, ''))}
              placeholder="12345678901"
              inputMode="numeric"
              maxLength={11}
              className="h-11"
              disabled={saving}
              required
            />
          </FormField>

          <FormField label="Acompañantes" htmlFor="vip-partners" hint="0 a 50">
            <Input
              id="vip-partners"
              type="number"
              min={0}
              max={50}
              value={partners}
              onChange={(event) => setPartners(event.target.value)}
              className="h-11"
              disabled={saving}
              required
            />
          </FormField>
        </div>

        {isEditing ? (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/50 p-4 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="size-4 rounded border-input accent-primary"
              disabled={saving}
            />
            VIP activo
          </label>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-11 bg-background"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="submit" className="h-11" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Guardando...
              </>
            ) : isEditing ? (
              'Guardar cambios'
            ) : (
              'Crear VIP'
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

interface VipFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vip?: VipUser | null
  onSaved: () => void
}

export function VipFormDialog({
  open,
  onOpenChange,
  vip = null,
  onSaved,
}: VipFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <VipForm
            key={vip?.id ?? 'new'}
            vip={vip}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
