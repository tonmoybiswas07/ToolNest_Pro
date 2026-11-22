import { DashboardWork } from "@/features/dashboard/dashboard-work";
import { StudentSnapshot } from "@/features/dashboard/student-snapshot";
import { readWorkspace } from "@/features/student/storage";
import { toolHref } from "@/features/tools/registry";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { dailyExecutionCounts, personalAnalytics } from "@/features/analytics/personal";
import type { Metadata } from "next";
import { LogoutButton } from "@/features/auth/logout-button";
import { AccountSummary } from "@/features/dashboard/account-summary";
import { UsageChart } from "@/features/dashboard/usage-chart";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user } = await requireSession();

  const [activity, student, usage] = await Promise.all([
    personalAnalytics(user.id).catch(() => null),
    readWorkspace(user.id).catch(() => null),
    dailyExecutionCounts(user.id).catch(() => null),
  ]);

  return (
    <div className="max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="page-title">Your dashboard</h1>
        <Button variant="outline" asChild>
          <Link href="/tools">Browse tools</Link>
        </Button>
      </header>
      <DashboardWork />
      {student && (
        <div className="mt-4">
          <StudentSnapshot data={student.data} />
        </div>
      )}
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
                        href={toolHref(tool)}
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
            {usage && <UsageChart data={usage} />}
          </section>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Tool activity is temporarily unavailable.
        </p>
      )}
      <div className="mt-8">
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
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
