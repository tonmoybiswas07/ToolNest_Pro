import { requireAdmin } from "@/features/admin/access";
import { eventPage } from "@/features/admin/data";
import { AuditLogTable } from "@/features/admin/events";
import { AdminHeading } from "@/features/admin/ui";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  return (
    <>
      <AdminHeading
        title="Audit logs"
        description="Append-only history of role, moderation, and settings changes."
      />
      <AuditLogTable
        data={await eventPage("admin_audit_logs", (await searchParams).page)}
      />
    </>
  );
}
