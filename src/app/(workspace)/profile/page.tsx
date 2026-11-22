import type { Metadata } from "next";
import { ProfileForm } from "@/features/auth/profile-form";
import { AccountSummary } from "@/features/dashboard/account-summary";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user } = await requireSession();

  return (
    <div className="max-w-4xl">
      <h1 className="page-title">Your profile</h1>
      <AccountSummary user={user} />
      <ProfileForm name={user.name} image={user.image} />
    </div>
  );
}
