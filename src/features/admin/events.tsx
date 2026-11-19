import type { eventPage } from "./data";
import { DataTable, Pagination, utcDate } from "./ui";

type Events = Awaited<ReturnType<typeof eventPage>>;

export function ActivityTable({ data }: { data: Events }) {
  return (
    <>
      <DataTable
        headers={["Timestamp (UTC)", "Event", "User ID", "Provider", "Outcome"]}
        empty={data.rows.length ? undefined : "No activity has been recorded."}
      >
        {data.rows.map((row) => (
          <tr key={String(row._id)}>
            <td>{utcDate(row.at)}</td>
            <td className="capitalize">{row.type.replaceAll("_", " ")}</td>
            <td>{row.userId ?? "—"}</td>
            <td>{row.provider ?? "—"}</td>
            <td>{row.success ? "Success" : "Failure"}</td>
          </tr>
        ))}
      </DataTable>
      <Pagination
        {...{ page: data.page, pages: data.pages }}
        href="/admin/activity"
      />
    </>
  );
}

export function AuditLogTable({ data }: { data: Events }) {
  return (
    <>
      <DataTable
        headers={[
          "Timestamp (UTC)",
          "Action",
          "Administrator",
          "Target",
          "Outcome",
          "Change",
        ]}
        empty={
          data.rows.length
            ? undefined
            : "No administrative actions have been recorded."
        }
      >
        {data.rows.map((row) => (
          <tr key={String(row._id)}>
            <td>{utcDate(row.at)}</td>
            <td className="capitalize">{row.action.replaceAll("_", " ")}</td>
            <td>{row.actorId}</td>
            <td>{row.targetId}</td>
            <td>{row.outcome}</td>
            <td>
              {Array.isArray(row.summary)
                ? row.summary.join(", ")
                : row.summary}
            </td>
          </tr>
        ))}
      </DataTable>
      <Pagination
        page={data.page}
        pages={data.pages}
        href="/admin/audit-logs"
      />
    </>
  );
}
