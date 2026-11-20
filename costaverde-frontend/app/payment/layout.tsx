import type { ReactNode } from "react";
import { Suspense } from "react";
import { AuthWrapper } from "@/components/Common/AuthWrapper";
import { LogoutButton } from "@/components/Common/LogoutButton";
import { PaymentSteps } from "@/components/Common/PaymentSteps";
import { Logo } from "@/components/Common/Logo";
import { PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { BRAND } from "@/lib/branding";

export default function PaymentLayout({ children }: { children: ReactNode }) {
  return (
    <AuthWrapper allowRestricted>
      <div className="flex min-h-screen flex-col bg-muted/40">
        <header className="border-b border-border bg-background">
          <div className="mx-auto flex h-18 max-w-4xl items-center justify-between gap-4 px-5 sm:px-8">
            <Logo />
            <LogoutButton />
          </div>
        </header>

        <div className="mx-auto w-full max-w-4xl px-5 pt-8 sm:px-8">
          <Suspense fallback={<div className="h-8" aria-hidden />}>
            <PaymentSteps />
          </Suspense>
        </div>

        <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:px-8">
          {children}
        </main>

        <footer className="border-t border-border bg-background py-5">
          <p className="text-center text-xs text-muted-foreground">
            Pago procesado por {PAYMENT_METHOD_LABEL} · {BRAND.name}
          </p>
        </footer>
      </div>
    </AuthWrapper>
  );
}
