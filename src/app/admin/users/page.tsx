import { requireAdmin } from "@/features/admin/access";
import { users } from "@/features/admin/data";
import { AdminHeading } from "@/features/admin/ui";
import { UsersTable } from "@/features/admin/users";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  return (
    <>
      <AdminHeading
        title="Users"
        description="Find accounts and manage account access."
      />
      <UsersTable data={await users(await searchParams)} />
    </>
  );
}
