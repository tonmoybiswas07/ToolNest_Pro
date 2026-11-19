import type { Metadata } from "next";
import { DashboardPreview } from "@/features/dashboard/dashboard-preview";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return <DashboardPreview />;
}
