"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { studentTools, toolHref } from "@/features/tools/registry";
import { collections } from "./collections";

export function StudentDirectory() {
  const [query, setQuery] = useState("");
  const matches = studentTools.filter((tool) =>
    `${tool.name} ${tool.description}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <div className="space-y-8">
      <label className="grid max-w-lg gap-2 text-sm font-medium">
        Search student tools
        <input
          type="search"
          className="student-input"
          placeholder="Try attendance or flashcards"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {collections.map((collection, i) => {
        const tools = matches.filter((tool) =>
          collection.slugs.includes(tool.slug),
        );
        return (
          tools.length > 0 && (
            <section
              key={collection.name}
              id={`collection-${i}`}
              className="scroll-mt-28"
            >
              <h2 className="student-display mb-3 text-2xl">{collection.name}</h2>
              <ul className="student-planner divide-y divide-[var(--student-rule)]">
                {tools.map((tool) => (
                  <li key={tool.slug}>
                    <Link className="student-tool-row" href={toolHref(tool)}>
                      <span className="student-tool-icon"><tool.icon size={19} aria-hidden /></span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{tool.name}</span>
                        <span className="block text-sm text-muted-foreground">{tool.description}</span>
                        {tool.status === "Requires Setup" && <span className="mt-1 block text-xs font-semibold text-[var(--student-ink)]">{tool.status}</span>}
                      </span>
                      <ArrowRight size={17} className="ml-auto shrink-0" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        );
      })}
      {!matches.length && (
        <p className="surface p-5 text-muted-foreground" role="status">
          No student tools match this search.
        </p>
      )}
    </div>
  );
}
