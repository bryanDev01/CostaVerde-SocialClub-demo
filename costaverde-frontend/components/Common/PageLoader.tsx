import Image from "next/image"
import { cn } from "@/lib/utils"
import { BRAND } from "@/lib/branding"

interface PageLoaderProps {
  title?: string
  description?: string
  className?: string
  fullScreen?: boolean
}

export function PageLoader({
  title = "Cargando tu experiencia",
  description = "Preparando actividades, aforos y reservas...",
  className,
  fullScreen = true,
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        "grid place-items-center bg-background px-6",
        fullScreen && "min-h-screen",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex animate-fade-in flex-col items-center text-center motion-reduce:animate-none">
        <div className="relative">
          <span
            aria-hidden
            className="absolute inset-0 animate-ping-soft rounded-full bg-primary/10 motion-reduce:animate-none"
          />
          <span
            aria-hidden
            className="absolute inset-0 animate-ping-soft rounded-full bg-primary/10 [animation-delay:0.8s] motion-reduce:animate-none"
          />

          <div className="relative size-32 overflow-hidden rounded-full border border-border bg-white shadow-[0_24px_60px_-28px_rgba(53,224,124,0.55)]">
            <span
              aria-hidden
              className="absolute left-[-50%] top-[72%] size-[200%] animate-wave-slow rounded-[40%] bg-primary/20 motion-reduce:animate-none"
            />
            <span
              aria-hidden
              className="absolute left-[-50%] top-[76%] size-[200%] animate-wave rounded-[40%] bg-primary motion-reduce:animate-none"
            />

            <span className="absolute left-1/2 top-1/2 z-10 size-12 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-white shadow-md ring-1 ring-border">
              <Image
                src={BRAND.logos.primary}
                alt=""
                aria-hidden
                width={1376}
                height={768}
                className={
                  BRAND.logos.primaryFit === "contain"
                    ? "size-full object-contain"
                    : "absolute left-[-64%] top-[-98%] h-[280%] w-auto max-w-none"
                }
              />
            </span>
          </div>
        </div>

        <p className="mt-10 font-display text-xl font-semibold tracking-tight text-foreground">
          {title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="mt-7 h-1.5 w-52 overflow-hidden rounded-full bg-muted">
          <span
            aria-hidden
            className="block h-full w-1/3 animate-shimmer rounded-full bg-primary motion-reduce:animate-none"
          />
        </div>
      </div>
    </div>
  )
}
