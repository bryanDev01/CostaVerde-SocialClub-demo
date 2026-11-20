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
import { useCompanyActions } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import type { CompanySummary } from '@/lib/types'

interface CompanyFormProps {
  company: CompanySummary | null
  onSaved: () => void
  onClose: () => void
}

function CompanyForm({ company, onSaved, onClose }: CompanyFormProps) {
  // Initialised once per mount; the parent remounts this form (via key) when
  // the target company or open state changes.
  const [name, setName] = useState(company?.name ?? '')
  const [isActive, setIsActive] = useState(company?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { createCompany, updateCompany } = useCompanyActions()

  const isEditing = Boolean(company)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('El nombre de la empresa es obligatorio')
      return
    }
    setSaving(true)
    try {
      if (company) {
        await updateCompany(company.id, { name: name.trim(), is_active: isActive })
        toast.success('Empresa actualizada')
      } else {
        await createCompany(name.trim())
        toast.success('Empresa creada')
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(describeApiError(err, 'No se pudo guardar la empresa'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar empresa' : 'Nueva empresa'}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Actualiza el nombre o el estado de la empresa.'
            : 'Crea una empresa para que su cuenta de RRHH pueda asociarse.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}

        <FormField label="Nombre de la empresa" htmlFor="company-name">
          <Input
            id="company-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Grupo Empresarial Marina"
            className="h-11"
            autoFocus
            disabled={saving}
            required
          />
        </FormField>

        {isEditing ? (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/50 p-4 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="size-4 rounded border-input accent-primary"
              disabled={saving}
            />
            Empresa activa
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
              'Crear empresa'
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

interface CompanyFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company?: CompanySummary | null
  onSaved: () => void
}

export function CompanyFormDialog({
  open,
  onOpenChange,
  company = null,
  onSaved,
}: CompanyFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? (
          <CompanyForm
            key={company?.id ?? 'new'}
            company={company}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
