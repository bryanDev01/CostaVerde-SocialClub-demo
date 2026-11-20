'use client'

import { useMemo, useState } from 'react'
import { RefreshCw, Search, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormAlert } from '@/components/Common/FormAlert'
import { EmptyState } from '@/components/Common/EmptyState'
import { SkeletonGrid } from '@/components/Common/SkeletonCard'
import { ActivityBrowseCard } from '@/components/Cards/ActivityBrowseCard'
import { useActivities } from '@/lib/hooks'

export default function ActivitiesPage() {
  const { activities, loading, error, refetch } = useActivities()
  const [query, setQuery] = useState('')

  const filteredActivities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return activities
      .filter((activity) => activity.is_active)
      .filter((activity) => {
        if (!normalizedQuery) return true
        return (
          activity.name.toLowerCase().includes(normalizedQuery) ||
          (activity.description ?? '').toLowerCase().includes(normalizedQuery) ||
          activity.category_name.toLowerCase().includes(normalizedQuery)
        )
      })
  }, [activities, query])

  const reservableActivities = filteredActivities.filter((activity) => activity.is_reservable)
  const informativeActivities = filteredActivities.filter((activity) => !activity.is_reservable)

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Actividades
        </p>
        <h1 className="mt-4 text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Elige tu próxima visita al club
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          Consulta los lugares del club. Los que requieren reserva muestran su
          disponibilidad en tiempo real; los demás son de acceso libre y puedes
          entrar con tu carnet sin reservar.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Buscar actividades..."
            className="h-12 pl-11"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar actividades"
          />
        </div>
      </div>

      <div className="mt-10">
        {loading ? (
          <SkeletonGrid count={6} className="sm:grid-cols-2 xl:grid-cols-3" />
        ) : error ? (
          <div className="mx-auto max-w-xl space-y-5">
            <FormAlert>No se pudieron cargar las actividades: {error}</FormAlert>
            <Button variant="outline" className="h-11 bg-background" onClick={refetch}>
              <RefreshCw className="size-4" aria-hidden />
              Reintentar
            </Button>
          </div>
        ) : filteredActivities.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No encontramos actividades"
            description="Prueba con otro término de búsqueda."
            action={
              <Button
                variant="outline"
                className="h-11 bg-background"
                onClick={() => setQuery('')}
              >
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <div className="space-y-14">
            <section aria-labelledby="reservables-title">
              <div className="mb-6">
                <h2 id="reservables-title" className="font-display text-2xl font-semibold tracking-tight text-foreground">
                  Lugares con reserva
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Requieren reserva previa. Elige un día y confirma tu cupo.
                </p>
              </div>
              {reservableActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay lugares con reserva con esos filtros.</p>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {reservableActivities.map((activity) => (
                    <ActivityBrowseCard key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="informativos-title">
              <div className="mb-6">
                <h2 id="informativos-title" className="font-display text-2xl font-semibold tracking-tight text-foreground">
                  Acceso libre e información
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  No requieren reserva. Entra con tu carnet cuando lo necesites.
                </p>
              </div>
              {informativeActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay lugares de acceso libre con esos filtros.</p>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {informativeActivities.map((activity) => (
                    <ActivityBrowseCard key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
