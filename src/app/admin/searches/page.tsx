import { requireAdmin } from "@/features/admin/access";
import { SearchAnalytics } from "@/features/admin/analytics";
import { rangeDays, reports } from "@/features/admin/reports";
import { AdminHeading, DateRangeFilter } from "@/features/admin/ui";
import { settings } from "@/features/analytics/store";

export default async function SearchesPage({
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
        title="Search analytics"
        description="Directory search volume and tool opens. Reporting dates use UTC."
      >
        <DateRangeFilter href="/admin/searches" days={days} />
      </AdminHeading>
      <SearchAnalytics report={await reports(days)} />
    </>
  );
}
