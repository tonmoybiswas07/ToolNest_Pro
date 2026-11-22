import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/features/admin/access";
import { AdminHeading } from "@/features/admin/ui";
import { applicationMongo } from "@/lib/mongodb";

type Feedback = {
  type: string;
  rating: number;
  message: string;
  tool?: string;
  url?: string;
  userEmail?: string | null;
  createdAt?: Date;
};

const filters = ["feedback", "bug", "suggestion"];
const pageSize = 30;

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  await requireAdmin();
  const { type, page } = await searchParams;
  const filter = typeof type === "string" && filters.includes(type) ? type : "";
  const requestedPage = typeof page === "string" && /^\d+$/.test(page) ? Number(page) : 1;
  const collection = applicationMongo().db.collection<Feedback>("user_feedback");
  const query = filter ? { type: filter } : {};
  const count = await collection.countDocuments(query);
  const lastPage = Math.max(1, Math.ceil(count / pageSize));
  const current = Math.max(1, Math.min(requestedPage, lastPage));
  const entries = await collection.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .skip((current - 1) * pageSize)
    .limit(pageSize)
    .toArray();
  const href = (value: string, index = 1) =>
    `/admin/feedback?type=${value}&page=${index}`;

  return (
    <>
      <AdminHeading title="Feedback" description="Review suggestions, bug reports, and ratings submitted through ToolNest." />
      <nav aria-label="Feedback type" className="flex flex-wrap gap-2">
        {["", ...filters].map((value) => (
          <Button asChild key={value} variant={filter === value ? "default" : "outline"}>
            <Link aria-current={filter === value ? "page" : undefined} href={href(value)} className="capitalize">
              {value || "All feedback"}
            </Link>
          </Button>
        ))}
      </nav>
      <p className="text-sm text-muted-foreground">{count} {count === 1 ? "submission" : "submissions"}</p>
      {entries.length ? (
        <ul className="grid gap-3">
          {entries.map((entry) => (
            <li className="surface space-y-3 p-5" key={entry._id.toString()}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold capitalize">{entry.type} · {entry.rating}/5</h2>
                {entry.createdAt instanceof Date && <time className="text-sm text-muted-foreground" dateTime={entry.createdAt.toISOString()}>
                  {entry.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                </time>}
              </div>
              <p className="whitespace-pre-wrap wrap-anywhere">{entry.message}</p>
              <p className="text-sm text-muted-foreground wrap-anywhere">
                {entry.userEmail || "Anonymous"}{entry.tool && ` · ${entry.tool}`}
              </p>
              {entry.url && <p className="text-xs text-muted-foreground wrap-anywhere">{entry.url}</p>}
            </li>
          ))}
        </ul>
      ) : <p className="surface p-5">No feedback in this view.</p>}
      {lastPage > 1 && (
        <nav aria-label="Feedback pages" className="flex items-center gap-3">
          {current > 1 && <Button asChild variant="outline"><Link href={href(filter, current - 1)}>Previous</Link></Button>}
          <span className="text-sm">Page {current} of {lastPage}</span>
          {current < lastPage && <Button asChild variant="outline"><Link href={href(filter, current + 1)}>Next</Link></Button>}
        </nav>
      )}
    </>
  );
}
