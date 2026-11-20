import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  kicker: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  children?: ReactNode;
}

export function SectionHeading({
  kicker,
  title,
  description,
  align = "left",
  className,
  children,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "w-full",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      <p
        className={cn(
          "inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary",
          align === "center" && "justify-center"
        )}
      >
        <span className="h-px w-8 bg-danger" aria-hidden />
        {kicker}
        {align === "center" && <span className="h-px w-8 bg-danger" aria-hidden />}
      </p>
      <h2 className="mt-5 text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}
