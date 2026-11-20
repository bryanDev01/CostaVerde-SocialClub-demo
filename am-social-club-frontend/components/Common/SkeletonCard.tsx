import { cn } from "@/lib/utils"

interface SkeletonCardProps {
  className?: string
  lines?: number
}

export function SkeletonCard({ className, lines = 3 }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl border border-border bg-card p-6 motion-reduce:animate-none",
        className
      )}
      aria-hidden
    >
      <div className="h-5 w-2/3 rounded-full bg-muted" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn("h-3.5 rounded-full bg-muted", index === lines - 1 ? "w-1/2" : "w-full")}
          />
        ))}
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-6 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}
