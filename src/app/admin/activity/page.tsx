import { requireAdmin } from "@/features/admin/access";
import { eventPage } from "@/features/admin/data";
import { ActivityTable } from "@/features/admin/events";
import { AdminHeading } from "@/features/admin/ui";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  return (
    <>
      <AdminHeading
        title="Activity"
        description="Recorded registrations, login attempts, logouts, and account status changes."
      />
      <ActivityTable
        data={await eventPage("activity_events", (await searchParams).page)}
      />
    </>
  );
}
