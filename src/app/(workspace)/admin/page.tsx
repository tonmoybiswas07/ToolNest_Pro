import type { Metadata } from "next";
import { DashboardPreview } from "@/features/dashboard/dashboard-preview";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default function AdminPage() {
  return <DashboardPreview admin />;
}
