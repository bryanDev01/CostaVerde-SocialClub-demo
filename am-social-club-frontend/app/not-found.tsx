import Link from "next/link";
import { ArrowRight, Home, LifeBuoy } from "lucide-react";
import { SiteHeader } from "@/components/Layout/SiteHeader";
import { SiteFooter } from "@/components/Layout/SiteFooter";
import { SUPPORT_EMAIL } from "@/lib/constants";

export default function NotFound() {
  return (
    <>
      <SiteHeader />

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-24 sm:px-8">
        <div
          aria-hidden
          className="dots-dark pointer-events-none absolute inset-0 -z-10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-28 top-10 -z-10 size-80 animate-float rounded-full border border-primary/10 motion-reduce:animate-none"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 bottom-0 -z-10 size-72 animate-float rounded-full bg-primary/5 blur-2xl [animation-delay:1.4s] motion-reduce:animate-none"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-[18%] top-[22%] -z-10 size-2.5 animate-float rounded-full bg-danger motion-reduce:animate-none"
        />

        <div className="mx-auto max-w-xl text-center">
          <p className="animate-fade-up text-xs font-semibold uppercase tracking-[0.26em] text-danger motion-reduce:animate-none">
            Error 404
          </p>

          <p
            className="mt-8 flex animate-fade-up items-center justify-center gap-3 font-display text-7xl font-semibold tracking-tight text-primary motion-reduce:animate-none sm:gap-4 sm:text-8xl"
            style={{ animationDelay: "80ms" }}
          >
            4
            <LifeBuoy
              className="size-[0.72em] animate-spin-slow text-danger motion-reduce:animate-none"
              strokeWidth={1.6}
              aria-hidden
            />
            4
          </p>

          <h1
            className="mt-10 animate-fade-up text-balance font-display text-3xl font-semibold tracking-tight text-foreground motion-reduce:animate-none sm:text-4xl"
            style={{ animationDelay: "160ms" }}
          >
            Esta página nadó a otra piscina
          </h1>

          <p
            className="mt-5 animate-fade-up text-pretty text-base leading-relaxed text-muted-foreground motion-reduce:animate-none"
            style={{ animationDelay: "240ms" }}
          >
            No encontramos lo que buscas. Puede que el enlace haya cambiado o
            que la actividad ya no esté disponible.
          </p>

          <div
            className="mt-10 flex animate-fade-up flex-col justify-center gap-3 motion-reduce:animate-none sm:flex-row"
            style={{ animationDelay: "320ms" }}
          >
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-7 text-[15px] font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Home className="size-4" aria-hidden />
              Volver al inicio
            </Link>
            <Link
              href="/#actividades"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-background px-7 text-[15px] font-semibold text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Ver actividades
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <p
            className="mt-10 animate-fade-up text-xs leading-relaxed text-muted-foreground motion-reduce:animate-none"
            style={{ animationDelay: "400ms" }}
          >
            ¿Crees que es un error? Escríbenos a{" "}
            <span className="font-medium text-foreground">{SUPPORT_EMAIL}</span>.
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
