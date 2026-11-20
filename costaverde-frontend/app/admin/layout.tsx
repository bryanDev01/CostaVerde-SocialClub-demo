import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthWrapper } from "@/components/Common/AuthWrapper";
import { ADMIN_PERMISSIONS } from "@/lib/staff";
import { AppShell } from "@/components/Layout/AppShell";

export const metadata: Metadata = {
  title: {
    default: "Administración",
    template: "%s · Administración",
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthWrapper allowedRoles={["admin"]} allowedPermissions={ADMIN_PERMISSIONS}>
      <AppShell variant="admin">{children}</AppShell>
    </AuthWrapper>
  );
}
