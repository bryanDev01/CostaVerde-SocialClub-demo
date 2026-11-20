import { HeroCta } from "./HeroCta";
import { HeroCarousel } from "./HeroCarousel";
import { BRAND } from "@/lib/branding";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-muted to-background"
      />

      <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-full flex-col items-center justify-center px-5 py-10 text-center sm:px-8 lg:px-12">
        <p className="animate-fade-down font-display text-3xl font-semibold tracking-tight text-primary sm:text-4xl lg:text-5xl">
          {BRAND.name}
        </p>

        <h1 className="animate-fade-up mt-2 w-full max-w-full text-balance font-display text-3xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          <span className="text-danger">El descanso que mereces</span>,{" "}
          <span className="text-shimmer italic">a un clic de distancia{" "}</span>.
        </h1>

        <p
          className="animate-fade-up mt-3 w-full max-w-full text-pretty text-base leading-snug text-muted-foreground sm:text-lg lg:text-xl"
          style={{ animationDelay: "200ms" }}
        >
          {BRAND.copy.heroSubtitle}
        </p>

        <div
          className="animate-fade-up mt-6 w-full max-w-full"
          style={{ animationDelay: "400ms" }}
        >
          <HeroCarousel />
        </div>

        <div className="animate-fade-up mt-6" style={{ animationDelay: "600ms" }}>
          <HeroCta />
        </div>

        <dl
          className="animate-fade-up mt-8 grid w-full max-w-full grid-cols-2 gap-x-6 gap-y-6 border-t border-border pt-6 sm:grid-cols-4"
          style={{ animationDelay: "800ms" }}
        >
          {BRAND.stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="mt-1 font-display text-3xl font-semibold text-primary">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
