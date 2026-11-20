import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/branding";

interface LogoProps {
  variant?: "default" | "light";
  href?: string | null;
  className?: string;
  compact?: boolean;
}

export function Logo({ variant = "default", href = "/", className, compact = false }: LogoProps) {
  const content = (
    <span className={cn("inline-flex min-w-0 items-center", compact ? "gap-2.5" : "gap-3", className)}>
      <span className={cn("flex shrink-0 items-center", compact ? "gap-1.5" : "gap-2")}>
        <span
          className={cn(
            "relative shrink-0 overflow-hidden rounded-xl border",
            compact ? "size-9" : "size-10",
            variant === "light" ? "border-white/25 bg-white" : "border-border bg-white"
          )}
        >
          <Image
            src={BRAND.logos.partner}
            alt={BRAND.logos.partnerAlt}
            width={1024}
            height={1024}
            className="size-full object-contain"
          />
        </span>
        <span
          className={cn(
            "relative shrink-0 overflow-hidden rounded-xl border",
            compact ? "size-9" : "size-10",
            variant === "light" ? "border-white/25 bg-white" : "border-border bg-muted"
          )}
        >
          {BRAND.logos.primaryFit === "contain" ? (
            <Image
              src={BRAND.logos.primary}
              alt={`Logo de ${BRAND.name}`}
              width={1376}
              height={768}
              className="size-full object-contain"
            />
          ) : (
            <Image
              src={BRAND.logos.primary}
              alt={`Logo de ${BRAND.name}`}
              width={1376}
              height={768}
              className="absolute left-[-64%] top-[-98%] h-[280%] w-auto max-w-none"
            />
          )}
        </span>
      </span>

      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            "truncate font-display font-semibold tracking-tight whitespace-nowrap",
            compact ? "text-base" : "text-lg",
            variant === "light" ? "text-white" : "text-foreground"
          )}
        >
          {BRAND.shortName}
        </span>
        <span
          className={cn(
            "mt-1 text-[10px] font-medium uppercase leading-tight tracking-[0.1em]",
            variant === "light" ? "text-white/60" : "text-muted-foreground"
          )}
        >
          {BRAND.name}
        </span>
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      aria-label={`${BRAND.shortName} — ${BRAND.name} — Inicio`}
      className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  );
}
