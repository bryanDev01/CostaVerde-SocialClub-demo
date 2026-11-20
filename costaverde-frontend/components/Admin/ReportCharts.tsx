import { cn } from '@/lib/utils'

export interface BarChartItem {
  label: string
  value: number
  caption?: string
}

interface HorizontalBarChartProps {
  items: BarChartItem[]
  formatValue?: (value: number) => string
  emptyMessage?: string
  className?: string
}

export function HorizontalBarChart({
  items,
  formatValue = (value) => String(value),
  emptyMessage = 'Sin datos para el período seleccionado.',
  className,
}: HorizontalBarChartProps) {
  if (items.length === 0) {
    return (
      <p className={cn('py-6 text-center text-sm text-muted-foreground', className)}>
        {emptyMessage}
      </p>
    )
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1)

  return (
    <ul className={cn('space-y-5', className)}>
      {items.map((item) => {
        const percent = Math.round((item.value / maxValue) * 100)
        return (
          <li key={item.label}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="truncate text-sm font-medium text-foreground">
                {item.label}
              </span>
              <span className="shrink-0 font-mono text-sm font-semibold text-primary">
                {formatValue(item.value)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            {item.caption ? (
              <p className="mt-1.5 text-xs text-muted-foreground">{item.caption}</p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
