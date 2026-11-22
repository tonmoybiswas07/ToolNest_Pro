const chartLabel = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function UsageChart({ data }: { data: { day: Date; count: number }[] }) {
  const maximum = Math.max(...data.map(({ count }) => count), 1);

  return (
    <figure className="mt-5">
      <figcaption className="text-sm font-medium">
        Successful runs per day over the last 14 days (UTC)
      </figcaption>
      <ul className="mt-3 grid grid-cols-7 gap-2 sm:grid-cols-14" role="list">
        {data.map(({ day, count }) => {
          const label = chartLabel.format(day);
          return (
            <li key={day.toISOString()} className="min-w-0 text-center" title={`${label} · ${count} runs`}>
              <span className="sr-only">{label}, {count} runs</span>
              <div aria-hidden="true">
                <span className="mb-1 block text-xs font-medium tabular-nums">{count}</span>
                <div className="flex h-20 items-end justify-center rounded-sm bg-muted/50">
                  <span
                    className="w-2/3 rounded-t-sm bg-primary"
                    style={{ height: `${count / maximum * 100}%` }}
                  />
                </div>
                <time
                  dateTime={day.toISOString().slice(0, 10)}
                  className="mt-1 block text-xs tabular-nums text-muted-foreground"
                >
                  {day.getUTCDate()}
                </time>
              </div>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
