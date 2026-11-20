import type { ReactNode } from "react";
import { AuthWrapper } from "@/components/Common/AuthWrapper";
import { AppShell } from "@/components/Layout/AppShell";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthWrapper>
      <AppShell variant="user">{children}</AppShell>
    </AuthWrapper>
  );
}
