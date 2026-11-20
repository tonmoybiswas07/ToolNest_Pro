import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardList, NotebookPen, Timer } from "lucide-react";
import { collections } from "./collections";

const shortcuts = [
  [CalendarDays, "Class routine", "Set your weekly class times", "class-routine-maker"],
  [ClipboardList, "Assignments", "See what’s due next", "assignment-tracker"],
  [Timer, "Focus timer", "Start a study session", "pomodoro-timer"],
  [NotebookPen, "Notes", "Open your study notes", "ai-notes-summarizer"],
] as const;

const faqs = [
  [
    "Can I get started without an account?",
    "Yes. Guest academic records stay in this browser. Use an account for syncing across devices and for AI summarization when a provider is configured.",
  ],
  [
    "Can I use my university’s grading scale?",
    "Yes. Enter your own grade labels and point values, and choose how repeated and excluded courses count.",
  ],
  [
    "Where are my files processed?",
    "PDF extraction and image recognition run on your device. If you choose AI summarization, the displayed text is sent to OpenAI only after you confirm the request.",
  ],
  [
    "How do I save a routine or grades as a PDF?",
    "Open the workspace, choose Print / Save PDF, then select Save as PDF in your browser’s print dialog.",
  ],
];

export function StudentLanding() {
  return (
    <div className="student-landing space-y-14 pb-6 sm:space-y-18">
      <section className="student-masthead grid items-center gap-9 px-5 py-9 sm:px-9 sm:py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:px-12 lg:py-16">
        <div>
          <p className="mb-4 text-sm font-semibold text-[var(--student-ink)]">Student Hub</p>
          <h1 className="student-display max-w-[13ch] text-5xl sm:text-6xl lg:text-7xl">
            Plan your semester.
          </h1>
          <p className="mt-5 max-w-[36ch] leading-relaxed text-muted-foreground sm:text-lg">
            Keep track of classes, deadlines, and grades, and make time to study.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link className="student-action" href="/student/dashboard">Open dashboard <ArrowRight size={17} aria-hidden /></Link>
            <Link className="student-text-link" href="/student/tools">Browse tools</Link>
          </div>
        </div>
        <section className="student-planner" aria-labelledby="planner-title">
          <h2 id="planner-title" className="border-b border-[var(--student-rule)] px-4 py-4 text-base font-semibold sm:px-5">Study planner</h2>
          <ul className="divide-y divide-[var(--student-rule)]">
            {shortcuts.map(([Icon, title, description, slug]) => (
              <li key={slug}>
                <Link className="student-tool-row" href={`/student/tools/${slug}`}>
                  <span className="student-tool-icon"><Icon size={19} aria-hidden /></span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-sm text-muted-foreground">{description}</span>
                  </span>
                  <ArrowRight size={17} className="ml-auto shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </section>

      <section aria-labelledby="student-collections">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="student-collections" className="student-display text-3xl sm:text-4xl">Tools for the semester</h2>
          <Link className="student-text-link text-sm" href="/student/tools">All student tools</Link>
        </div>
        <div className="grid border-y border-[var(--student-rule)] md:grid-cols-3">
          {collections.map((item, i) => (
            <Link key={item.name} className="group border-[var(--student-rule)] px-3 py-5 hover:bg-[var(--student-tint)] max-md:border-b max-md:last:border-b-0 md:px-5 md:not-first:border-l" href={`/student/tools#collection-${i}`}>
              <h3 className="flex items-center justify-between gap-3 font-semibold">{item.name}<ArrowRight size={16} className="shrink-0" aria-hidden /></h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="student-masthead flex flex-wrap items-center justify-between gap-5 p-5 sm:p-8" aria-labelledby="student-start">
        <div>
          <h2 id="student-start" className="student-display text-3xl">Start with your courses</h2>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">Add each course once and use it in your timetable, assignments, attendance, and grades.</p>
        </div>
        <Link className="student-action" href="/student/settings">Set up courses <ArrowRight size={17} aria-hidden /></Link>
      </section>

      <section aria-labelledby="student-faq" className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <h2 id="student-faq" className="student-display text-3xl">Frequently asked questions</h2>
        <div className="divide-y divide-[var(--student-rule)] border-y border-[var(--student-rule)]">
          {faqs.map(([question, answer]) => (
            <details key={question} className="py-4">
              <summary className="cursor-pointer font-medium">{question}</summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
