import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthWrapper } from "@/components/Common/AuthWrapper";
import { AppShell } from "@/components/Layout/AppShell";

export const metadata: Metadata = {
  title: {
    default: "Recepción",
    template: "%s · Recepción",
  },
};

export default function ReceptionistLayout({ children }: { children: ReactNode }) {
  return (
    <AuthWrapper allowedPermissions={["reception"]}>
      <AppShell variant="receptionist">{children}</AppShell>
    </AuthWrapper>
  );
}