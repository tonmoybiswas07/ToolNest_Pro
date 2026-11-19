import { requireAdmin } from "@/features/admin/access";
import { AdminSettingsForm } from "@/features/admin/actions";
import { AdminHeading } from "@/features/admin/ui";
import { settings } from "@/features/analytics/store";

export default async function AdminSettingsPage() {
  await requireAdmin();
  return (
    <>
      <AdminHeading
        title="Settings"
        description="Manage reporting preferences, collection controls, and retention."
      />
      <AdminSettingsForm config={await settings()} />
    </>
  );
}
