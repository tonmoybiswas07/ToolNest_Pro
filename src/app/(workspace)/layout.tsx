import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WorkspaceShell } from "@/features/dashboard/workspace-shell";

export const metadata: Metadata = { robots: { index: false } };

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
