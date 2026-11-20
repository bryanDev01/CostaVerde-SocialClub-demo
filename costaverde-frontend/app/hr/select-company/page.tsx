'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FormAlert } from '@/components/Common/FormAlert'
import { SkeletonCard } from '@/components/Common/SkeletonCard'
import { useAuth } from '@/app/providers'
import { useHrAssignCompany, useHrAvailableCompanies } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'

export default function HrSelectCompanyPage() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const { companies, loading, error, refetch } = useHrAvailableCompanies()
  const { assignCompany } = useHrAssignCompany()
  const [selectingId, setSelectingId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const alreadyLinked = Boolean(user?.company_id)

  const handleSelect = async (companyId: string, companyName: string) => {
    setSelectingId(companyId)
    setSubmitError(null)
    try {
      await assignCompany(companyId)
      await refreshUser()
      toast.success(`Empresa asignada: ${companyName}`)
      router.replace('/hr')
    } catch (err) {
      setSubmitError(describeApiError(err, 'No se pudo asignar la empresa'))
    } finally {
      setSelectingId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Recursos Humanos
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Selecciona tu empresa
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Antes de continuar, elige la empresa a la que perteneces. Esta
          selección es única: solo puede haber una cuenta de Recursos Humanos
          por empresa y no podrá cambiarse por tu cuenta.
        </p>
      </header>

      {alreadyLinked ? (
        <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <CheckCircle2 className="size-6 text-primary" aria-hidden />
          <p className="mt-3 font-display text-lg font-semibold text-foreground">
            Ya tienes una empresa asignada
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.company_name ?? 'Empresa asignada'}
          </p>
          <Button className="mt-5 h-11" onClick={() => router.replace('/hr')}>
            Ir al panel
          </Button>
        </div>
      ) : error ? (
        <div className="mt-10 space-y-5">
          <FormAlert>No se pudieron cargar las empresas: {error}</FormAlert>
          <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
            <RefreshCw className="size-4" aria-hidden />
            Reintentar
          </Button>
        </div>
      ) : loading ? (
        <div className="mt-10 space-y-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      ) : companies.length === 0 ? (
        <div className="mt-10 flex items-start gap-3 rounded-2xl border border-border bg-muted/50 p-6">
          <Building2 className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">
              No hay empresas disponibles
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Todas las empresas ya tienen una cuenta de Recursos Humanos o aún
              no se ha creado ninguna. Contacta al administrador.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-10 space-y-4">
          {submitError ? <FormAlert>{submitError}</FormAlert> : null}
          {companies.map((company) => (
            <button
              key={company.id}
              type="button"
              disabled={selectingId !== null}
              onClick={() => handleSelect(company.id, company.name)}
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="size-5" aria-hidden />
                </span>
                <span className="font-display text-lg font-semibold text-foreground">
                  {company.name}
                </span>
              </span>
              {selectingId === company.id ? (
                <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
              ) : (
                <span className="text-sm font-semibold text-primary">Seleccionar</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
