import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { dayAt, type Student } from "../student/model";

export function StudentSnapshot({ data }: { data: Student }) {
  const cards = data.decks.flatMap((deck) => deck.cards);
  if (
    !data.classes.length &&
    !data.assignments.length &&
    !cards.length &&
    !data.courses.length
  )
    return null;
  const now = dayAt(data.timezone);
  const today = now.toPlainDate();
  const time = now.toPlainTime().toString({ smallestUnit: "minute" });
  const upcoming = data.classes
    .map((row) => {
      let offset = (row.day - now.dayOfWeek + 7) % 7;
      if (offset === 0 && row.start < time) offset = 7;
      return { row, day: today.add({ days: offset }).toString() };
    })
    .sort((a, b) =>
      (a.day + a.row.start).localeCompare(b.day + b.row.start),
    )[0];
  const deadline = data.assignments
    .filter(
      (row) =>
        row.status !== "Done" && Date.parse(row.due) >= now.epochMilliseconds,
    )
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due))[0];
  const due = cards.filter((card) => card.due <= today.toString()).length;
  const entries = [
    {
      name: "Next class",
      href: "/student/routine",
      detail: upcoming
        ? `${data.courses.find((course) => course.id === upcoming.row.course)?.name ?? "Class"} · ${upcoming.day} at ${upcoming.row.start}`
        : "No upcoming classes",
    },
    {
      name: "Next deadline",
      href: "/student/assignments",
      detail: deadline
        ? `${deadline.title} · ${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: data.timezone }).format(new Date(deadline.due))}`
        : "No upcoming deadlines",
    },
    {
      name: "Flashcard review",
      href: "/student/tools/flashcard-maker",
      detail: `${due} due today`,
    },
  ];
  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <GraduationCap size={18} className="text-highlight" aria-hidden />{" "}
          Student snapshot
        </h2>
        <Link
          className="text-sm font-medium text-highlight hover:underline"
          href="/student/dashboard"
        >
          Academic dashboard
        </Link>
      </div>
      <ul className="mt-3 grid gap-2 md:grid-cols-3">
        {entries.map((entry) => (
          <li key={entry.href}>
            <Link
              className="block h-full rounded-lg border border-border p-3 hover:bg-accent"
              href={entry.href}
            >
              <span className="block text-xs font-medium text-muted-foreground">
                {entry.name}
              </span>
              <span className="block text-sm font-semibold wrap-anywhere">
                {entry.detail}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
