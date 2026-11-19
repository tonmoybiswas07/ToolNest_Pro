import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireAdmin } from "@/features/admin/access";
import { AdminShell } from "@/features/admin/shell";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireAdmin();
  return (
    <AdminShell user={{ name: user.name, image: user.image }}>
      {children}
    </AdminShell>
  );
}
