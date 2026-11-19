import Link from "next/link";
import { Button } from "@/components/ui/button";
import { personalAnalytics } from "@/features/analytics/personal";
import type { Metadata } from "next";
import { LogoutButton } from "@/features/auth/logout-button";
import { AccountSummary } from "@/features/dashboard/account-summary";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user } = await requireSession();

  const activity = await personalAnalytics(user.id).catch(() => null);

  return (
    <div className="max-w-4xl">
      <h1 className="page-title">Your dashboard</h1>
      <AccountSummary user={user} />
      <div className="mt-5 flex flex-wrap gap-2">
        {user.role === "admin" && (
          <Button asChild>
            <Link href="/admin">Admin dashboard</Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/settings#privacy">Privacy settings</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tools">Browse tools</Link>
        </Button>
        <LogoutButton />
      </div>
      {activity ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            { title: "Recently used tools", entries: activity.recent },
            { title: "Favorite tools", entries: activity.favorites },
          ].map(({ title, entries }) => (
            <section key={title} className="surface p-5">
              <h2 className="text-lg font-semibold">{title}</h2>
              {entries.length ? (
                <ul className="mt-3 space-y-2">
                  {entries.map((tool) => (
                    <li key={tool.slug}>
                      <Link
                        className="text-highlight hover:underline"
                        href={`/tools/${tool.slug}`}
                      >
                        {tool.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No tools to show yet.
                </p>
              )}
            </section>
          ))}
          <section className="surface p-5 sm:col-span-2">
            <h2 className="text-lg font-semibold">Personal usage</h2>
            <p className="mt-2 text-muted-foreground">
              {activity.executionCount} successful tool executions in the
              retained analytics period.
            </p>
          </section>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Tool activity is temporarily unavailable.
        </p>
      )}
    </div>
  );
}
