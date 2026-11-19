import type { Metadata } from "next";
import { LogoutButton } from "@/features/auth/logout-button";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireSession();

  return (
    <div className="max-w-4xl">
      <h1 className="page-title">Settings</h1>
      <section className="surface mt-8 p-5 sm:p-8" aria-labelledby="session-heading">
        <h2 id="session-heading" className="text-xl font-semibold">Current session</h2>
        <p className="mt-1 text-muted-foreground">Sign out of ToolNest Pro on this device.</p>
        <LogoutButton className="mt-5" />
      </section>
    </div>
  );
}
