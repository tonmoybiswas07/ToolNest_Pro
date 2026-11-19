import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dateRanges } from "./reports";

export function AdminHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function DateRangeFilter({
  days,
  href,
}: {
  days: number;
  href: string;
}) {
  return (
    <nav aria-label="Reporting range" className="flex flex-wrap gap-2">
      {dateRanges.map((value) => (
        <Button
          key={value}
          asChild
          size="default"
          variant={days === value ? "default" : "outline"}
        >
          <Link
            aria-current={days === value ? "true" : undefined}
            href={`${href}?days=${value}`}
          >
            Last {value} days
          </Link>
        </Button>
      ))}
    </nav>
  );
}

export function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="surface p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </p>
    </div>
  );
}

type Point = { label: string; value: number };

export function AnalyticsChart({
  title,
  data,
  secondary,
  horizontal = false,
}: {
  title: string;
  data: Point[];
  secondary?: Point[];
  horizontal?: boolean;
}) {
  const max = Math.max(
    1,
    ...data.map((point) => point.value),
    ...(secondary ?? []).map((point) => point.value),
  );
  return (
    <section className="surface min-w-0 p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {!data.some((point) => point.value) &&
      !secondary?.some((point) => point.value) ? (
        <p className="grid min-h-28 place-items-center text-center text-sm text-muted-foreground">
          No events in this range.
        </p>
      ) : horizontal ? (
        <ul className="grid gap-3">
          {data.map(({ label, value }) => (
            <li key={label} className="grid gap-1 text-sm">
              <div className="flex justify-between gap-3">
                <span>{label}</span>
                <span>{value}</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-accent"
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(100 * value) / max}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="flex h-32 items-end gap-px" aria-hidden>
            {data.map((point, index) => (
              <div
                key={point.label}
                title={`${point.label}: ${point.value}${secondary ? ` success, ${secondary[index].value} failed` : ""}`}
                className="flex h-full min-w-0 flex-1 items-end gap-px"
              >
                <div
                  className="flex-1 rounded-t-sm bg-primary"
                  style={{ height: `${(100 * point.value) / max}%` }}
                />
                {secondary && (
                  <div
                    className="flex-1 rounded-t-sm bg-blue-500"
                    style={{
                      height: `${(100 * secondary[index].value) / max}%`,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{data[0]?.label}</span>
            <span>{data.at(-1)?.label}</span>
          </div>
          {secondary && (
            <p className="mt-3 text-sm text-muted-foreground">
              Violet: successful · Blue: failed
            </p>
          )}
          <details className="mt-3 text-sm">
            <summary className="w-fit cursor-pointer text-highlight">
              View daily values
            </summary>
            <ul className="mt-2 max-h-40 overflow-auto">
              {data.map((point, index) => (
                <li key={point.label}>
                  {point.label}: {point.value}
                  {secondary
                    ? ` successful, ${secondary[index].value} failed`
                    : ""}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}

export function DataTable({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: ReactNode;
  empty?: string;
}) {
  return (
    <div className="surface overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-accent/65 text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="whitespace-nowrap px-4 py-3 font-medium"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border [&_td]:px-4 [&_td]:py-3">
          {empty ? (
            <tr>
              <td
                colSpan={headers.length}
                className="text-center text-muted-foreground"
              >
                {empty}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  pages,
  href,
  input = {},
}: {
  page: number;
  pages: number;
  href: string;
  input?: Record<string, unknown>;
}) {
  const link = (target: number) =>
    `${href}?${new URLSearchParams(Object.entries({ ...input, page: target }).map(([key, value]) => [key, String(value)]))}`;
  return (
    <nav
      aria-label="Table pagination"
      className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"
    >
      <span>
        Page {page} of {pages}
      </span>
      {page > 1 && (
        <Button asChild variant="outline">
          <Link href={link(page - 1)}>Previous</Link>
        </Button>
      )}
      {page < pages && (
        <Button asChild variant="outline">
          <Link href={link(page + 1)}>Next</Link>
        </Button>
      )}
    </nav>
  );
}

export function utcDate(value: string | Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(value))
    : "—";
}

export const selectStyle = cn(
  "h-12 rounded-xl border border-input bg-background px-3 text-sm",
);
