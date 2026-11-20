import type { ReactNode } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { Logo } from "@/components/Common/Logo";
import { HOME_IMAGES } from "@/lib/homeContent";
import { PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { BRAND } from "@/lib/branding";

const HIGHLIGHTS = [
  {
    title: "Aforo en tiempo real",
    description: "Consulta la disponibilidad antes de confirmar tu reserva.",
  },
  {
    title: PAYMENT_METHOD_LABEL,
    description: "Adjunta tu número de operación y activa tu suscripción.",
  },
  {
    title: "Carné digital con QR",
    description: "Entra al club sin filas ni papeleo, desde tu teléfono.",
  },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-primary text-white lg:flex lg:flex-col">
        <Image
          src={HOME_IMAGES.entrance}
          alt={`Entrada del ${BRAND.name}`}
          fill
          priority
          sizes="(max-width: 1024px) 0vw, 52vw"
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-primary/25"
        />

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Logo variant="light" />

          <div className="max-w-lg">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/60">
              Bienvenido al club
            </p>
            <p className="mt-6 text-balance font-display text-4xl font-semibold leading-tight xl:text-[2.75rem]">
              El descanso que mereces,{" "}
              <span className="italic text-white/80">a un clic de distancia</span>.
            </p>

            <ul className="mt-12 space-y-7">
              {HIGHLIGHTS.map((item) => (
                <li key={item.title} className="flex items-start gap-4">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white/15">
                    <Check className="size-3.5 text-white" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/70">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-white/60">
            {BRAND.name} · {BRAND.city}
          </p>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12 sm:px-10">
        <div className="mb-10 lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
