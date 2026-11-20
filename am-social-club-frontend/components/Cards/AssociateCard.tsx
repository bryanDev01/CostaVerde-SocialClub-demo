import { Cake, IdCard, Pencil, Phone, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FAMILY_RELATIONS } from '@/lib/constants'
import { formatDate } from '@/lib/dates'
import { getInitials } from '@/lib/utils'
import type { Associate } from '@/lib/types'

interface AssociateCardProps {
  associate: Associate
  onEdit: () => void
  onDelete: () => void
}

export function AssociateCard({ associate, onEdit, onDelete }: AssociateCardProps) {
  const relationLabel =
    FAMILY_RELATIONS.find((relation) => relation.value === associate.relation)?.label ??
    associate.relation

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 font-display text-base font-semibold text-primary">
          {getInitials(associate.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{associate.name}</h3>
          <span className="mt-1.5 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            {relationLabel}
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:text-primary"
            onClick={onEdit}
            aria-label={`Editar a ${associate.name}`}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:bg-danger/10 hover:text-danger"
            onClick={onDelete}
            aria-label={`Eliminar a ${associate.name}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <dl className="mt-4 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <IdCard className="size-3.5 shrink-0" aria-hidden />
          <dt className="sr-only">Carnet de identidad</dt>
          <dd className="font-mono tracking-wider text-foreground">{associate.ci}</dd>
        </div>
        {associate.phone ? (
          <div className="flex items-center gap-2">
            <Phone className="size-3.5 shrink-0" aria-hidden />
            <dt className="sr-only">Teléfono</dt>
            <dd>{associate.phone}</dd>
          </div>
        ) : null}
        {associate.date_of_birth ? (
          <div className="flex items-center gap-2">
            <Cake className="size-3.5 shrink-0" aria-hidden />
            <dt className="sr-only">Fecha de nacimiento</dt>
            <dd>{formatDate(associate.date_of_birth)}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  )
}
