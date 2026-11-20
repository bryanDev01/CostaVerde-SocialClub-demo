import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface ActivityItem {
  title: string;
  description: string;
  image: string;
  tag: string;
  capacity: string;
  href: string;
}

export function ActivityCard({
  title,
  description,
  image,
  tag,
  capacity,
  href,
}: ActivityItem) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(53,224,124,0.4)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={image}
          alt={title}
          width={800}
          height={600}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-sm">
          {tag}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {capacity}
          </span>
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Reservar
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </article>
  );
}
