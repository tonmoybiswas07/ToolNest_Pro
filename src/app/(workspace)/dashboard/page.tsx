import type { Metadata } from "next";
import { LogoutButton } from "@/features/auth/logout-button";
import { AccountSummary } from "@/features/dashboard/account-summary";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user } = await requireSession();

  return (
    <div className="max-w-4xl">
      <h1 className="page-title">Your dashboard</h1>
      <AccountSummary user={user} />
      <LogoutButton className="mt-5" />
    </div>
  );
}
