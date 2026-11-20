import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlanItem {
  name: string;
  duration: string;
  price: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

export function PlanCard({
  name,
  duration,
  price,
  features,
  highlighted = false,
  badge,
}: PlanItem) {
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-2xl border p-7 transition-all duration-300",
        highlighted
          ? "border-primary bg-primary text-primary-foreground shadow-[0_30px_60px_-25px_rgba(53,224,124,0.65)]"
          : "border-border bg-card shadow-sm hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(53,224,124,0.35)]"
      )}
    >
      {badge ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-danger px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-danger-foreground shadow-md">
          {badge}
        </span>
      ) : null}

      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-[0.2em]",
          highlighted ? "text-white/60" : "text-muted-foreground"
        )}
      >
        {name}
      </p>

      <p className="mt-5 flex items-baseline gap-2">
        <span className="font-display text-4xl font-semibold tracking-tight">
          ${price}
        </span>
        <span className={cn("text-sm", highlighted ? "text-white/60" : "text-muted-foreground")}>
          CUP
        </span>
      </p>
      <p className={cn("mt-1 text-sm", highlighted ? "text-white/70" : "text-muted-foreground")}>
        {duration}
      </p>

      <ul className="mt-7 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <span
              className={cn(
                "mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full",
                highlighted ? "bg-white/15 text-white" : "bg-primary/10 text-primary"
              )}
            >
              <Check className="size-3" aria-hidden />
            </span>
            <span className={highlighted ? "text-white/85" : "text-muted-foreground"}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/register"
        className={cn(
          "mt-8 grid h-11 place-items-center rounded-lg text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
          highlighted
            ? "bg-white text-primary hover:bg-white/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        Elegir plan
      </Link>
    </article>
  );
}
