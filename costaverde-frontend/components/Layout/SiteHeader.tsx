"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Common/Logo";
import { useAuth } from "@/app/providers";
import { logout } from "@/lib/auth";
import { defaultRouteForUser } from "@/lib/staff";
import { resolveMediaUrl } from "@/lib/api";
import { cn, getInitials } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Servicios", href: "/#actividades" },
  { label: "Reglas", href: "/#reglas" },
  { label: "Planes", href: "/#planes" },
];

interface ProfileAvatarProps {
  name: string;
  photoUrl: string | null;
  className?: string;
}

function ProfileAvatar({ name, photoUrl, className }: ProfileAvatarProps) {
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-primary/10 font-display text-sm font-semibold text-primary",
        className
      )}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto de perfil externa opcional
        <img src={resolveMediaUrl(photoUrl) ?? undefined} alt="" className="size-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    setOpen(false);
    logout();
    router.replace("/login");
  };

  const authActions = loading ? null : user ? (
    <>
      <div className="hidden items-center gap-1.5 lg:flex">
        <Button variant="outline" className="h-10 bg-background" asChild>
          <Link href={defaultRouteForUser(user)}>Mi panel</Link>
        </Button>
        <Link
          href="/profile"
          aria-label={`Ir al perfil de ${user.name}`}
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ProfileAvatar name={user.name} photoUrl={user.profile_photo_url} />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="size-4.5" />
        </Button>
      </div>

      <Link
        href="/profile"
        aria-label={`Ir al perfil de ${user.name}`}
        className="rounded-full outline-none lg:hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ProfileAvatar name={user.name} photoUrl={user.profile_photo_url} />
      </Link>
    </>
  ) : (
    <>
      <div className="hidden items-center gap-2 lg:flex">
        <Button variant="ghost" asChild>
          <Link href="/login">Iniciar sesión</Link>
        </Button>
        <Button asChild>
          <Link href="/register">Crear cuenta</Link>
        </Button>
      </div>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <Logo />

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {authActions}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="grid size-11 place-items-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-border bg-background px-5 pb-6 pt-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Principal móvil">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-3">
            {loading ? null : user ? (
              <>
                <Button asChild>
                  <Link href={defaultRouteForUser(user)} onClick={() => setOpen(false)}>
                    Mi panel
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/profile" onClick={() => setOpen(false)}>
                    <ProfileAvatar
                      name={user.name}
                      photoUrl={user.profile_photo_url}
                      className="size-8 text-xs"
                    />
                    Mi perfil
                  </Link>
                </Button>
                <Button variant="ghost" className="justify-start" onClick={handleLogout}>
                  <LogOut className="size-4.5" aria-hidden />
                  Cerrar sesión
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href="/login">Iniciar sesión</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Crear cuenta</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
