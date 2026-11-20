import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthWrapper } from "@/components/Common/AuthWrapper";
import { HrCompanyGuard } from "@/components/Common/HrCompanyGuard";
import { AppShell } from "@/components/Layout/AppShell";

export const metadata: Metadata = {
  title: {
    default: "Recursos Humanos",
    template: "%s · Recursos Humanos",
  },
};

export default function HrLayout({ children }: { children: ReactNode }) {
  return (
    <AuthWrapper allowedRoles={["hr", "admin"]}>
      <HrCompanyGuard>
        <AppShell variant="hr">{children}</AppShell>
      </HrCompanyGuard>
    </AuthWrapper>
  );
}
