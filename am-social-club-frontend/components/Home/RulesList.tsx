import { ScrollText } from 'lucide-react'
import type { RuleItem } from '@/lib/homeContent'
import { FULL_RULES_NOTE } from '@/lib/homeContent'
import { BRAND } from '@/lib/branding'
import { cn } from '@/lib/utils'

interface RulesListProps {
  rules: RuleItem[]
  className?: string
}

export function RulesList({ rules, className }: RulesListProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card shadow-sm',
        className
      )}
    >
      <header className="flex items-center gap-3.5 border-b border-border px-5 py-4 sm:px-6">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <ScrollText className="size-4.5" aria-hidden />
        </span>
        <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
          {BRAND.copy.rulesTitle}
        </h3>
      </header>

      <div className="px-5 py-6 sm:px-6">
        <ol className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {rules.map((rule, index) => (
            <li key={rule.id} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-danger/10 text-[11px] font-semibold text-danger"
              >
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {rule.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {rule.description}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-6 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
          {FULL_RULES_NOTE}
        </p>
      </div>
    </section>
  )
}