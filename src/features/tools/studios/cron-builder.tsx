"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CodeBlock, ExportActions, Field, Notice, Panel, useLiveMetric, type StudioProps } from "./shared";

const fields = [
  { label: "Minute", min: 0, max: 59, hint: "0–59" },
  { label: "Hour", min: 0, max: 23, hint: "0–23" },
  { label: "Day of month", min: 1, max: 31, hint: "1–31" },
  { label: "Month", min: 1, max: 12, hint: "1–12" },
  { label: "Day of week", min: 0, max: 7, hint: "0 or 7 = Sun, 6 = Sat" },
] as const;

const presets = [
  { label: "Every minute", expression: "* * * * *", description: "Runs every minute." },
  { label: "Every 5 minutes", expression: "*/5 * * * *", description: "Runs every five minutes, starting at the top of the hour." },
  { label: "Every 15 minutes", expression: "*/15 * * * *", description: "Runs at minutes 0, 15, 30, and 45 of each hour." },
  { label: "Every 30 minutes", expression: "*/30 * * * *", description: "Runs twice an hour, at minutes 0 and 30." },
  { label: "Every hour", expression: "0 * * * *", description: "Runs at the top of every hour." },
  { label: "Every 6 hours", expression: "0 */6 * * *", description: "Runs at midnight, 6 AM, noon, and 6 PM." },
  { label: "Daily at midnight", expression: "0 0 * * *", description: "Runs every day at midnight." },
  { label: "Weekdays at 9 AM", expression: "0 9 * * 1-5", description: "Runs Monday through Friday at 9 AM." },
  { label: "Weekends at noon", expression: "0 12 * * 0,6", description: "Runs Saturday and Sunday at noon." },
  { label: "Every Monday at 9 AM", expression: "0 9 * * 1", description: "Runs every Monday at 9 AM." },
  { label: "First of every month", expression: "0 0 1 * *", description: "Runs at midnight on the first day of each month." },
  { label: "Quarterly", expression: "0 0 1 1,4,7,10 *", description: "Runs at midnight on the first day of January, April, July, and October." },
  { label: "Every New Year", expression: "0 0 1 1 *", description: "Runs at midnight on January 1." },
];

function isValidField(value: string, min: number, max: number) {
  const inRange = (number: number) => number >= min && number <= max;
  return value.split(",").every((segment) => {
    const match = /^(\*|\d{1,2}(?:-\d{1,2})?)(?:\/(\d{1,2}))?$/.exec(segment);
    if (!match) return false;
    const [, range, step] = match;
    if (step && (Number(step) < 1 || Number(step) > max - min + 1)) return false;
    if (range === "*") return true;
    const [start, end] = range.split("-").map(Number);
    if (end === undefined) return !step && inRange(start);
    return inRange(start) && inRange(end) && start <= end;
  });
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function describeFields([minute, hour, day, month, weekday]: string[]) {
  const parts: string[] = [];
  if (minute === "*" && hour === "*") parts.push("Runs every minute");
  else if (minute.startsWith("*/") && /^\*\/\d+$/.test(minute) && hour === "*") {
    parts.push(`Runs every ${Number(minute.slice(2))} minutes from the top of each hour`);
  } else if (/^\d+$/.test(minute) && hour === "*") {
    parts.push(`Runs at minute ${Number(minute)} of every hour`);
  } else if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
    parts.push(`Runs at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`);
  } else {
    parts.push(`Matches minutes ${minute} and hours ${hour}`);
  }

  const dayFilter = /^\d+$/.test(day) ? `day ${Number(day)} of the month` : `day-of-month field ${day}`;
  const weekdayFilter = /^\d+$/.test(weekday) ? dayNames[Number(weekday) % 7] : `day-of-week field ${weekday}`;
  if (day !== "*" && weekday !== "*") {
    const join = day[0] !== "*" && weekday[0] !== "*" ? "or" : "and";
    parts.push(`on ${dayFilter} ${join} ${weekdayFilter}`);
  } else if (day !== "*") parts.push(`on ${dayFilter}`);
  else if (weekday !== "*") parts.push(`on ${weekdayFilter}`);
  if (month !== "*") parts.push(`in ${monthNames[Number(month) - 1] ?? `months matching ${month}`}`);
  return parts.join(" ") + ".";
}

export default function CronBuilder({ slug }: StudioProps) {
  const [parts, setParts] = useState(() => "0 9 * * 1".split(" "));
  const [changed, setChanged] = useState(false);
  const normalized = parts.map((part) => part.trim());
  const expression = normalized.join(" ");
  const valid = fields.every(({ min, max }, index) => isValidField(normalized[index], min, max));
  const preset = presets.find((entry) => entry.expression === expression);
  useLiveMetric(slug, valid ? expression : "", changed);

  return (
    <div className="mt-8 grid gap-4">
      <Panel title="Cron expression builder">
        <div>
          <p className="mb-2 text-sm font-semibold">Presets</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((entry) => (
              <button key={entry.expression} type="button" aria-pressed={preset === entry}
                className="rounded-lg border border-border bg-accent px-3 py-1.5 text-sm transition-colors hover:bg-primary hover:text-primary-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                onClick={() => { setChanged(true); setParts(entry.expression.split(" ")); }}>
                {entry.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {fields.map(({ label, min, max, hint }, index) => (
            <div key={label}>
              <Field label={label}>
                <Input type="text" className="font-mono" placeholder="*" maxLength={80}
                  value={parts[index]} aria-invalid={!isValidField(normalized[index], min, max)}
                  onChange={(event) => {
                    setChanged(true);
                    setParts((current) => current.map((part, position) => position === index ? event.target.value : part));
                  }} />
              </Field>
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            </div>
          ))}
        </div>
        <Notice>Use * for any value, commas for lists, hyphens for ranges, and / for steps such as */15.</Notice>
      </Panel>
      <Panel title="Generated expression">
        <CodeBlock>{expression}</CodeBlock>
        {valid ? (
          <>
            <Notice>{preset?.description ?? describeFields(normalized)} Times follow your cron server’s time zone.</Notice>
            <ExportActions value={expression} filename="cron.txt" label="Copy expression" />
          </>
        ) : <Notice error>Check the highlighted fields and their allowed ranges.</Notice>}
      </Panel>
    </div>
  );
}
