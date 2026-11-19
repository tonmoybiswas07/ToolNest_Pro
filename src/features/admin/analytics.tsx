import type { reports } from "./reports";
import { AnalyticsChart, DataTable, StatCard } from "./ui";

type Report = Awaited<ReturnType<typeof reports>>;

export function SearchAnalytics({ report }: { report: Report }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Directory searches" value={report.stats.searches} />
        <StatCard label="Zero-result searches" value={report.zero} />
        <StatCard
          label="Search-to-tool conversion"
          value={
            report.stats.searches
              ? `${((100 * report.converted) / report.stats.searches).toFixed(1)}%`
              : "—"
          }
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChart title="Search volume" data={report.searches} />
        <AnalyticsChart
          title="Catalog keywords with at least five searches"
          data={report.terms}
          horizontal
        />
      </div>
    </>
  );
}

export function ToolAnalytics({ report }: { report: Report }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered tools" value={report.toolRows.length} />
        <StatCard
          label="Successful executions"
          value={report.stats.executions}
        />
        <StatCard label="Unique signed-in users" value={report.unique} />
        <StatCard
          label="Failed executions"
          value={report.toolRows.reduce((total, row) => total + row.errors, 0)}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChart title="Execution trend" data={report.usageTrend} />
        <AnalyticsChart
          title="Tool executions by category"
          data={report.categoryRows}
          horizontal
        />
      </div>
      <h2 className="text-xl font-semibold">Tools ranked by executions</h2>
      <DataTable
        headers={[
          "Tool",
          "Category",
          "Executions",
          "Unique signed-in users",
          "Errors",
        ]}
      >
        {report.toolRows.map((row) => (
          <tr key={row.slug}>
            <td>{row.name}</td>
            <td>{row.category}</td>
            <td>{row.executions}</td>
            <td>{row.unique}</td>
            <td>{row.errors}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
