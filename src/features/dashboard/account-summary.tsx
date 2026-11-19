import { UserAvatar } from "@/features/auth/user-avatar";

export function AccountSummary({ user }: { user: { name: string; email: string; image?: string | null } }) {
  return (
    <section aria-label="Account details" className="surface mt-8 flex flex-wrap items-center gap-4 p-5 sm:p-8">
      <UserAvatar name={user.name} image={user.image} large />
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-semibold wrap-break-word">{user.name}</h2>
        <p className="wrap-break-word text-muted-foreground">{user.email}</p>
      </div>
      <span className="status-pill">Signed in</span>
    </section>
  );
}
