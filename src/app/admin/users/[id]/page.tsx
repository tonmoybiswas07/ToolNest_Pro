import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/admin/access";
import { userDetails } from "@/features/admin/data";
import { AdminHeading } from "@/features/admin/ui";
import { UserDetails } from "@/features/admin/users";

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAdmin();
  const user = await userDetails((await params).id);
  if (!user) notFound();
  return (
    <>
      <AdminHeading
        title="User details"
        description="Account status and recorded sign-in history."
      />
      <UserDetails user={user} actor={actor.id} />
    </>
  );
}
