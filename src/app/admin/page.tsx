import { requireAdmin } from "@/features/admin/access";
import { rangeDays, reports } from "@/features/admin/reports";
import {
  AdminHeading,
  AnalyticsChart,
  DateRangeFilter,
  StatCard,
} from "@/features/admin/ui";
import { settings } from "@/features/analytics/store";

export default async function AdminOverview({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireAdmin();
  const days = rangeDays(
    (await searchParams).days,
    (await settings()).dashboardDays,
  );
  const report = await reports(days);
  const { stats } = report;
  const cards = [
    ["Registered users", stats.total],
    ["New users today", stats.todayCount],
    ["New users this month", stats.monthCount],
    ["Active users today", stats.active],
    ["Successful logins", stats.successful],
    ["Failed logins", stats.failures],
    ["Tool executions", stats.executions],
    ["Tool searches", stats.searches],
  ] as const;

  return (
    <>
      <AdminHeading
        title="Overview"
        description="Account and toolkit activity. Reporting dates use UTC."
      >
        <DateRangeFilter days={days} href="/admin" />
      </AdminHeading>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <StatCard key={label} label={label} value={value} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChart title="User registration growth" data={report.growth} />
        <AnalyticsChart
          title="Login activity"
          data={report.successful}
          secondary={report.failures}
        />
        <AnalyticsChart title="Daily active users" data={report.active} />
        <AnalyticsChart
          title="Most-used tools"
          data={report.toolRows
            .slice(0, 6)
            .map((row) => ({ label: row.name, value: row.executions }))}
          horizontal
        />
        <AnalyticsChart title="Search volume" data={report.searches} />
        <AnalyticsChart
          title="Tool executions by category"
          data={report.categoryRows}
          horizontal
        />
      </div>
    </>
  );
}
