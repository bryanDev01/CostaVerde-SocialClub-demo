import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { BRAND } from "@/lib/branding";
import { Logo } from "@/components/Common/Logo";

const EXPLORE_LINKS = [
  { label: "Actividades", href: "/#actividades" },
  { label: "Eventos", href: "/#eventos" },
  { label: "Planes", href: "/#planes" },
  { label: "Cómo funciona", href: "/#como-funciona" },
];

const SUPPORT_LINKS = [
  { label: "Preguntas frecuentes", href: "/#como-funciona" },
  { label: "Términos de servicio", href: "/login" },
  { label: "Política de privacidad", href: "/login" },
];

const CONTACT_ITEMS = [
  { icon: MapPin, text: BRAND.address },
  { icon: Phone, text: BRAND.phone.replace('+53 ', '') },
  { icon: Phone, text: BRAND.phoneAlt },
  { icon: Clock, text: BRAND.schedule },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-primary text-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo variant="light" href={null} />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/70">
              {BRAND.copy.footerBlurb}
            </p>
          </div>

          <nav aria-label="Explorar">
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
              Explorar
            </h3>
            <ul className="mt-5 space-y-3">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/80 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Soporte">
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
              Soporte
            </h3>
            <ul className="mt-5 space-y-3">
              {SUPPORT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/80 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
              Contacto
            </h3>
            <ul className="mt-5 space-y-3">
              {CONTACT_ITEMS.map((item) => (
                <li key={item.text} className="flex items-center gap-3 text-sm text-white/80">
                  <item.icon className="size-4 shrink-0 text-white/50" aria-hidden />
                  {item.text}
                </li>
              ))}
              <li className="flex items-center gap-3 text-sm text-white/80">
                <Mail className="size-4 shrink-0 text-white/50" aria-hidden />
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="break-all transition-colors hover:text-white"
                >
                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/50 sm:flex-row">
          <p>© {year} {BRAND.name}. Todos los derechos reservados.</p>
          <p className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-danger" aria-hidden />
            Sistema de reservas v1.0
          </p>
        </div>
      </div>
    </footer>
  );
}
