import { requireAdmin } from "@/features/admin/access";
import { ToolAnalytics } from "@/features/admin/analytics";
import { rangeDays, reports } from "@/features/admin/reports";
import { AdminHeading, DateRangeFilter } from "@/features/admin/ui";
import { settings } from "@/features/analytics/store";

export default async function ToolAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireAdmin();
  const days = rangeDays(
    (await searchParams).days,
    (await settings()).dashboardDays,
  );
  return (
    <>
      <AdminHeading
        title="Tool analytics"
        description="Execution data for the existing toolkit registry. Reporting dates use UTC."
      >
        <DateRangeFilter href="/admin/tools" days={days} />
      </AdminHeading>
      <ToolAnalytics report={await reports(days)} />
    </>
  );
}
