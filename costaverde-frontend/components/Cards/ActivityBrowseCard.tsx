import { ActivityImageCarousel } from "@/components/Common/ActivityImageCarousel";
import Link from "next/link";
import { ArrowRight, MapPin, Users } from "lucide-react";
import { StatusBadge } from "@/components/Common/StatusBadge";
import { resolveActivityImage } from "@/lib/placeholders";
import { cn } from "@/lib/utils";
import type { ActivityWithCategory } from "@/lib/types";

interface ActivityBrowseCardProps {
  activity: ActivityWithCategory;
}

function getAvailability(activity: ActivityWithCategory) {
  const remaining = Math.max(activity.capacity - activity.reserved_today, 0);
  if (remaining === 0) {
    return { label: "Sin cupos", variant: "negative" as const, remaining };
  }
  if (remaining <= Math.ceil(activity.capacity * 0.2)) {
    return { label: "Últimos cupos", variant: "negative" as const, remaining };
  }
  return { label: `${remaining} cupos`, variant: "positive" as const, remaining };
}

export function ActivityBrowseCard({ activity }: ActivityBrowseCardProps) {
  const reservable = activity.is_reservable;
  const availability = getAvailability(activity);
  const occupancy = Math.min(
    Math.round((activity.reserved_today / activity.capacity) * 100),
    100
  );

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(30,58,138,0.4)]">
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
        <ActivityImageCarousel
          images={activity.images?.length ? activity.images : [resolveActivityImage(activity)]}
          alt={activity.name}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
        <span className="absolute left-4 top-4 z-10 rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-sm">
          {activity.category_name}
        </span>
        <StatusBadge
          status="neutral"
          variant={reservable ? availability.variant : "neutral"}
          label={reservable ? availability.label : "Acceso libre"}
          className="absolute right-4 top-4 z-10 bg-white/95 shadow-sm"
        />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
          {activity.name}
        </h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {activity.description ?? "Actividad disponible para socios del club."}
        </p>

        {activity.location ? (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {activity.location}
          </p>
        ) : null}

        <div className="mt-5 border-t border-border pt-4">
          {reservable ? (
            <>
              <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" aria-hidden />
                  {activity.reserved_today} / {activity.capacity}
                </span>
                <span>{occupancy}% ocupado</span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    availability.remaining === 0 ? "bg-danger" : "bg-primary"
                  )}
                  style={{ width: `${occupancy}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Sin reserva previa · Entra con tu carnet
            </p>
          )}
        </div>

        <Link
          href={`/activities/${activity.id}`}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {reservable ? "Ver disponibilidad" : "Ver información"}
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </article>
  );
}
