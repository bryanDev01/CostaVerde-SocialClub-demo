'use client'

import { Input } from '@/components/ui/input'
import { todayInputValue, toDateInputValue } from '@/lib/dates'
import { cn } from '@/lib/utils'

export type RangePreset = 'today' | 'week' | 'month' | 'custom'

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Últimos 7 días' },
  { value: 'month', label: 'Este mes' },
  { value: 'custom', label: 'Personalizado' },
]

export function getPresetRange(preset: Exclude<RangePreset, 'custom'>): {
  start: string
  end: string
} {
  const today = new Date()
  const end = toDateInputValue(today)

  if (preset === 'today') {
    return { start: end, end }
  }

  if (preset === 'week') {
    const start = new Date(today)
    start.setDate(start.getDate() - 6)
    return { start: toDateInputValue(start), end }
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  return { start: toDateInputValue(start), end }
}

interface DateRangeSelectorProps {
  preset: RangePreset
  startDate: string
  endDate: string
  onPresetChange: (preset: RangePreset) => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  startId?: string
  endId?: string
  label?: string
}

export function DateRangeSelector({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
  startId = 'range-start',
  endId = 'range-end',
  label = 'Período del reporte',
}: DateRangeSelectorProps) {
  return (
    <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div
        className="inline-flex flex-wrap rounded-xl border border-border bg-muted/60 p-1"
        role="group"
        aria-label={label}
      >
        {RANGE_PRESETS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onPresetChange(option.value)}
            aria-pressed={preset === option.value}
            className={cn(
              'rounded-lg px-3.5 py-2 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50',
              preset === option.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor={startId}
            className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Desde
          </label>
          <Input
            id={startId}
            type="date"
            className="h-11 w-40"
            value={startDate}
            max={endDate}
            onChange={(event) => onStartDateChange(event.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor={endId}
            className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Hasta
          </label>
          <Input
            id={endId}
            type="date"
            className="h-11 w-40"
            value={endDate}
            min={startDate}
            max={todayInputValue()}
            onChange={(event) => onEndDateChange(event.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
