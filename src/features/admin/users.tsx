import Link from "next/link";
import { UserAvatar } from "@/features/auth/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserModeration } from "./actions";
import type { userDetails, users } from "./data";
import { DataTable, Pagination, selectStyle, utcDate } from "./ui";

type Row = NonNullable<Awaited<ReturnType<typeof userDetails>>>;
const providerNames = (row: Row) =>
  row.providers
    .map((provider) =>
      provider === "credential" ? "Email/password" : "Google",
    )
    .join(", ") || "—";

export function UsersTable({
  data,
}: {
  data: Awaited<ReturnType<typeof users>>;
}) {
  const { rows, input, pages, count } = data;
  return (
    <>
      <form
        action="/admin/users"
        className="surface flex flex-wrap items-end gap-3 p-4"
      >
        <label className="grid min-w-48 flex-1 gap-1 text-sm">
          Name or email
          <Input
            name="q"
            type="search"
            defaultValue={input.q}
            maxLength={100}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Role
          <select className={selectStyle} name="role" defaultValue={input.role}>
            <option value="all">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Status
          <select
            className={selectStyle}
            name="status"
            defaultValue={input.status}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Registration
          <select
            className={selectStyle}
            name="order"
            defaultValue={input.order}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <Button type="submit" size="lg">
          Apply filters
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">{count} matching accounts</p>
      <DataTable
        headers={[
          "Name",
          "Email",
          "Role",
          "Provider",
          "Registered (UTC)",
          "Last login (UTC)",
          "Status",
          "Actions",
        ]}
        empty={rows.length ? undefined : "No users match these filters."}
      >
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <div className="flex min-w-32 items-center gap-2">
                <UserAvatar name={row.name} image={row.image} />
                <span>{row.name}</span>
              </div>
            </td>
            <td>{row.email}</td>
            <td className="capitalize">{row.role}</td>
            <td>{providerNames(row)}</td>
            <td>{utcDate(row.createdAt)}</td>
            <td>{utcDate(row.lastLogin)}</td>
            <td>{row.suspended ? "Suspended" : "Active"}</td>
            <td>
              <Link
                className="font-semibold text-highlight hover:underline"
                href={`/admin/users/${row.id}`}
              >
                View
              </Link>
            </td>
          </tr>
        ))}
      </DataTable>
      <Pagination
        page={input.page}
        pages={pages}
        href="/admin/users"
        input={input}
      />
    </>
  );
}

export function UserDetails({ user, actor }: { user: Row; actor: string }) {
  return (
    <section className="surface max-w-2xl space-y-5 p-6">
      <div className="flex min-w-0 items-center gap-4">
        <UserAvatar name={user.name} image={user.image} large />
        <div className="min-w-0">
          <h2 className="wrap-break-word text-xl font-semibold">{user.name}</h2>
          <p className="wrap-break-word text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        {[
          ["Account ID", user.id],
          ["Role", user.role],
          ["Authentication provider", providerNames(user)],
          ["Status", user.suspended ? "Suspended" : "Active"],
          ["Registered (UTC)", utcDate(user.createdAt)],
          ["Last successful login (UTC)", utcDate(user.lastLogin)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="wrap-break-word font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {user.role !== "admin" && user.id !== actor && (
        <UserModeration id={user.id} suspended={user.suspended} />
      )}
    </section>
  );
}
