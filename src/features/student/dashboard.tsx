"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  Layers3,
  NotebookPen,
  Percent,
  Timer,
} from "lucide-react";
import type { ReactNode } from "react";
import { studentTools, toolHref } from "@/features/tools/registry";
import { attendanceStats, dateAt, dayAt, gradeStats } from "./model";
import { courseName, readable, useStudent } from "./workspace";

function Widget({
  icon: Icon,
  title,
  href,
  children,
}: {
  icon: typeof Timer;
  title: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <section className="student-widget min-w-0 p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="student-tool-icon">
          <Icon size={19} aria-hidden />
        </span>
        <h2 className="min-w-0 flex-1 font-semibold">{title}</h2>
        <Link
          className="rounded-md p-2 hover:bg-accent"
          href={href}
          aria-label={`Open ${title}`}
        >
          <ArrowRight size={17} aria-hidden />
        </Link>
      </div>
      {children}
    </section>
  );
}

const tool = (slug: string) => `/student/tools/${slug}`;
const muted = "text-sm text-muted-foreground";

export function StudentDashboard({ favorites }: { favorites: string[] }) {
  const { data } = useStudent();
  const day = dayAt(data.timezone);
  const today = day.toPlainDate().toString();
  const now = day.epochMilliseconds;
  const classes = data.classes
    .filter((item) => item.day === day.dayOfWeek)
    .sort((a, b) => a.start.localeCompare(b.start));
  const assignments = data.assignments
    .filter((item) => item.status !== "Done")
    .sort((a, b) => a.due.localeCompare(b.due));
  const exams = data.exams
    .filter((item) => Date.parse(item.date) >= now)
    .sort((a, b) => a.date.localeCompare(b.date));
  const notes = [...data.notes].sort((a, b) =>
    b.created.localeCompare(a.created),
  );
  const study = data.study.filter(
    (item) => dateAt(data.timezone, Date.parse(item.ended)) === today,
  );
  const minutes = study.reduce((sum, item) => sum + item.minutes, 0);
  const attendance = attendanceStats(
    data.attendance.filter((item) => item.attended).length,
    data.attendance.length,
    data.target,
  );
  const grades = gradeStats(data);
  const cards = data.decks.flatMap((item) => item.cards);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          ["Add assignment", tool("assignment-tracker")],
          ["Start focus", tool("pomodoro-timer")],
          ["Manage courses", "/student/settings"],
        ].map(([label, href]) => (
          <Link
            key={href}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
            href={href}
          >
            {label}
          </Link>
        ))}
      </div>
      {attendance.percent !== null && attendance.percent < data.target && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle size={16} aria-hidden />
          <span>
            Attendance warning: {attendance.percent.toFixed(1)}% — below your {data.target}% target.{" "}
            {attendance.needed > 0 && attendance.needed !== Infinity
              ? `Attend ${attendance.needed} more class${attendance.needed === 1 ? "" : "es"} to reach your target.`
              : ""}
          </span>
          <Link
            href={tool("attendance-tracker")}
            className="ml-auto shrink-0 underline underline-offset-2"
          >
            View
          </Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Widget
          icon={CalendarDays}
          title="Today's classes"
          href={tool("class-routine-maker")}
        >
          {!classes.length ? (
            <p className={muted}>No classes scheduled for today.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {classes.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <strong>{item.start}</strong> ·{" "}
                  {courseName(data, item.course)}{" "}
                  {item.room && <>· {item.room}</>}
                </li>
              ))}
            </ul>
          )}
        </Widget>
        <Widget
          icon={CalendarCheck}
          title="Assignment deadlines"
          href={tool("assignment-tracker")}
        >
          {!assignments.length ? (
            <p className={muted}>No open assignments.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {assignments.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <p className="font-medium wrap-anywhere">{item.title}</p>
                  <p
                    className={
                      Date.parse(item.due) < now ? "text-destructive" : muted
                    }
                  >
                    {Date.parse(item.due) < now ? "Overdue · " : ""}
                    {readable(item.due, data.timezone)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Widget>
        <Widget
          icon={Percent}
          title="Attendance progress"
          href={tool("attendance-tracker")}
        >
          {attendance.percent === null ? (
            <p className={muted}>Record a session to see your attendance.</p>
          ) : (
            <>
              <p className="text-3xl font-semibold tabular-nums">
                {attendance.percent.toFixed(1)}%
              </p>
              <progress
                className="my-2 w-full accent-primary"
                value={attendance.percent}
                max={100}
                aria-label="Overall attendance"
              />
              <p className={muted}>
                {data.attendance.length} sessions · {data.target}% target
              </p>
            </>
          )}
        </Widget>
        <Widget
          icon={GraduationCap}
          title="Current CGPA"
          href={tool("cgpa-calculator")}
        >
          {grades.gpa === null ? (
            <p className={muted}>Add semester grades to calculate CGPA.</p>
          ) : (
            <>
              <p className="text-3xl font-semibold tabular-nums">
                {grades.gpa.toFixed(2)}
              </p>
              <p className={muted}>
                {grades.completedCredits} completed credits
              </p>
            </>
          )}
        </Widget>
        <Widget
          icon={CalendarDays}
          title="Upcoming exams"
          href={tool("exam-study-planner")}
        >
          {!exams.length ? (
            <p className={muted}>No upcoming exams.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {exams.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <p className="font-medium">{courseName(data, item.course)}</p>
                  <p className={muted}>{readable(item.date, data.timezone)}</p>
                </li>
              ))}
            </ul>
          )}
        </Widget>
        <Widget
          icon={Timer}
          title="Study hours today"
          href={tool("pomodoro-timer")}
        >
          {!study.length ? (
            <p className={muted}>No focus sessions logged today.</p>
          ) : (
            <>
              <p className="text-3xl font-semibold tabular-nums">
                {(minutes / 60).toFixed(2)} h
              </p>
              <p className={muted}>
                {study.length} sessions · {minutes}/{data.studyGoal} goal
                minutes
              </p>
            </>
          )}
        </Widget>
        <Widget
          icon={NotebookPen}
          title="Recent notes"
          href={tool("ai-notes-summarizer")}
        >
          {!notes.length ? (
            <p className={muted}>No saved notes or summaries.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {notes.slice(0, 4).map((item) => (
                <li key={item.id} className="wrap-anywhere">
                  {item.title}
                </li>
              ))}
            </ul>
          )}
        </Widget>
        <Widget
          icon={Layers3}
          title="Flashcard review"
          href={tool("flashcard-maker")}
        >
          {!cards.length ? (
            <p className={muted}>Create a deck to begin reviewing.</p>
          ) : (
            <p className={muted}>
              {cards.filter((item) => item.due <= today).length} due ·{" "}
              {cards.length} cards across {data.decks.length} decks
            </p>
          )}
        </Widget>
      </div>
      <section className="surface p-5">
        <h2 className="mb-3 text-lg font-semibold">Favorite student tools</h2>
        {!favorites.length ? (
          <p className={muted}>
            Save a favorite from any student tool while signed in.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {studentTools
              .filter((item) => favorites.includes(item.slug))
              .map((item) => (
                <li key={item.slug}>
                  <Link className="underline" href={toolHref(item)}>
                    {item.name}
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>
      <section className="surface p-5">
        <h2 className="mb-3 text-lg font-semibold">Quick tool launcher</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {studentTools.map((item) => (
            <li key={item.slug}>
              <Link
                className="flex h-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
                href={toolHref(item)}
              >
                <item.icon
                  size={17}
                  className="shrink-0 text-highlight"
                  aria-hidden
                />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
