"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, BookOpen, CalendarDays, Search, Timer } from "lucide-react";
import { ToolCard } from "@/features/tools/cards";
import { studentTools } from "@/features/tools/registry";
import { collections } from "./collections";

const collectionIcons = [CalendarDays, Timer, BookOpen];

export function StudentDirectory() {
  const [query, setQuery] = useState("");
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = studentTools.filter((tool) => {
    const text = `${tool.name} ${tool.description}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });
  const groups = collections
    .map((collection, i) => ({
      ...collection,
      id: `collection-${i}`,
      icon: collectionIcons[i],
      tools: matches.filter((tool) => collection.slugs.includes(tool.slug)),
    }))
    .filter((group) => group.tools.length);

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="student-masthead grid items-end gap-6 p-5 sm:p-8 md:grid-cols-[1fr_minmax(15rem,22rem)]">
        <div>
          <h1 className="student-display text-4xl sm:text-5xl">
            Student tools
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Organize your courses, make time to study, and work with academic
            sources.
          </p>
        </div>
        <label className="grid min-w-0 gap-2 text-sm font-semibold">
          <span>Search student tools</span>
          <span className="relative block">
            <Search
              size={17}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              className="student-input !pl-9"
              placeholder="Try attendance or flashcards"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </span>
        </label>
      </header>

      {groups.length > 0 && (
        <nav
          aria-label="Student tool categories"
          className="flex flex-wrap gap-2"
        >
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`#${group.id}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              {group.name}{" "}
              <ArrowDown
                size={14}
                className="shrink-0 text-highlight"
                aria-hidden
              />
            </Link>
          ))}
        </nav>
      )}

      {groups.map(({ id, name, description, icon: Icon, tone, tools }) => (
        <section
          key={id}
          id={id}
          aria-labelledby={`${id}-title`}
          className="scroll-mt-24"
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="student-collection-icon" data-tone={tone}>
              <Icon size={20} aria-hidden />
            </span>
            <div>
              <h2
                id={`${id}-title`}
                className="student-display text-2xl sm:text-3xl"
              >
                {name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tools.map((tool) => (
              <li key={tool.slug} className="min-w-0">
                <ToolCard tool={tool} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!groups.length && (
        <div className="student-widget flex flex-wrap items-center justify-between gap-3 p-5">
          <p role="status" className="text-sm text-muted-foreground">
            No student tools match this search.
          </p>
          <button
            type="button"
            className="student-text-link text-sm"
            onClick={() => setQuery("")}
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
