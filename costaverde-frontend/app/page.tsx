import Link from "next/link";
import { SiteHeader } from "@/components/Layout/SiteHeader";
import { SiteFooter } from "@/components/Layout/SiteFooter";
import { MarqueeBanner } from "@/components/Home/MarqueeBanner";
import { Hero } from "@/components/Home/Hero";
import { RulesList } from "@/components/Home/RulesList";
import { SectionHeading } from "@/components/Common/SectionHeading";
import { PlanCard, type PlanItem } from "@/components/Home/PlanCard";
import { PlacesShowcase } from "@/components/Home/PlacesShowcase";
import { RULES } from "@/lib/homeContent";

const PLANS: PlanItem[] = [
  {
    name: "Plan 1 mes",
    duration: "Acceso por 30 días",
    price: 150,
    features: [
      "Acceso a todas las actividades",
      "Hasta 4 acompañantes",
      "Carné digital con QR",
      "Reserva en línea 24/7",
    ],
  },
  {
    name: "Plan 3 meses",
    duration: "Acceso por 90 días",
    price: 450,
    highlighted: true,
    badge: "Más elegido",
    features: [
      "Acceso a todas las actividades",
      "Hasta 4 acompañantes",
      "Carné digital con QR",
      "Reserva en línea 24/7",
    ],
  },
  {
    name: "Plan 6 meses",
    duration: "Acceso por 180 días",
    price: 900,
    features: [
      "Acceso a todas las actividades",
      "Hasta 4 acompañantes",
      "Carné digital con QR",
      "Reserva en línea 24/7",
    ],
  },
  {
    name: "Plan 12 meses",
    duration: "Acceso por 365 días",
    price: 1440,
    features: [
      "Acceso a todas las actividades",
      "Hasta 4 acompañantes",
      "Carné digital con QR",
      "Reserva en línea 24/7",
    ],
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <MarqueeBanner />

      <main>
        <Hero />

        {/* Actividades en general: un solo listado, sin categorías. Visible para
            todos (visitantes y autenticados); al abrir un lugar los visitantes
            ven la invitación a iniciar sesión. */}
        <section
          id="actividades"
          className="mx-auto max-w-7xl scroll-mt-24 px-5 py-12 sm:px-8 lg:py-16"
        >
          <SectionHeading
            kicker="Nuestros servicios"
            title="Todo lo que puedes disfrutar en el club"
            description="Un solo recorrido por todos los espacios del club, con sus fotos, aforo y horarios."
          />

          <PlacesShowcase className="mt-10" />
        </section>

        {/* Reglas: siempre visibles (especificación §3.4) */}
        <section
          id="reglas"
          className="mx-auto max-w-7xl scroll-mt-24 px-5 pt-4 pb-12 sm:px-8 lg:pb-16"
        >
          <RulesList rules={RULES} />
        </section>

        {/* Planes de suscripción con espacio superior para separar de Reglas */}
        <section
          id="planes"
          className="mx-auto max-w-7xl scroll-mt-24 border-t border-border px-5 py-12 sm:px-8 lg:py-16"
        >
          <SectionHeading
            kicker="Planes"
            title="Una suscripción, todo el club"
            description="Elige la duración que mejor te convenga. Activamos tu acceso en cuanto validamos tu pago con Transfermóvil · Pago en línea."
            align="center"
          />

          <div className="mt-16 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((plan) => (
              <PlanCard key={plan.name} {...plan} />
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-xl text-center text-sm text-muted-foreground">
            Los precios están expresados en pesos cubanos (CUP) y pueden
            actualizarse desde el panel de administración.
          </p>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-14 sm:px-8">
          <div className="relative overflow-hidden rounded-4xl bg-primary px-6 py-10 text-center sm:px-12 lg:py-14">
            <div aria-hidden className="dots-light absolute inset-0" />
            <div
              aria-hidden
              className="absolute -right-24 -top-24 size-72 rounded-full border border-white/10"
            />
            <div
              aria-hidden
              className="absolute -bottom-32 -left-20 size-80 rounded-full border border-white/10"
            />

            <div className="relative mx-auto max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
                Empieza hoy
              </p>
              <h2 className="mt-5 text-balance font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
                ¿Listo para tu próxima visita al club?
              </h2>
              <p className="mt-5 text-pretty text-base leading-relaxed text-white/75">
                Crea tu cuenta, activa tu suscripción y reserva en minutos.
                Sin filas, sin papeleo, sin excusas.
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="grid h-12 place-items-center rounded-lg bg-white px-7 text-[15px] font-semibold text-primary outline-none transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Crear cuenta
                </Link>
                <Link
                  href="/login"
                  className="grid h-12 place-items-center rounded-lg border border-white/30 px-7 text-[15px] font-semibold text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Iniciar sesión
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
