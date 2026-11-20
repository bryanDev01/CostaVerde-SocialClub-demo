'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const

interface PageSizeSelectProps {
  value: number
  onChange: (value: number) => void
  options?: readonly number[]
  className?: string
}

export function PageSizeSelect({
  value,
  onChange,
  options = PAGE_SIZE_OPTIONS,
  className,
}: PageSizeSelectProps) {
  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
      <SelectTrigger className={className} aria-label="Filas por página">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((size) => (
          <SelectItem key={size} value={String(size)}>
            {size} por página
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
