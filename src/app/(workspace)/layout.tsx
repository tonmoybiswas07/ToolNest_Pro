import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireSession } from "@/lib/session";
import { WorkspaceShell } from "@/features/dashboard/workspace-shell";

export const metadata: Metadata = { robots: { index: false } };

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
