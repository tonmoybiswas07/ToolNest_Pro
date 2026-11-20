"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendAnalytics } from "@/features/analytics/client";
import { cn } from "@/lib/utils";
import { ToolCard } from "./cards";
import { categories, categoryIds, tools, type CategoryId } from "./registry";

export function Directory({
  initialCategory,
}: {
  initialCategory: CategoryId | "all";
}) {
  const [category, setCategory] = useState<CategoryId | "all">(initialCategory);
  const [query, setQuery] = useState("");
  const [categoryChanged, setCategoryChanged] = useState(false);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = tools.filter((tool) => {
    const searchable =
      `${tool.name} ${tool.description} ${categories[tool.category].name}`.toLowerCase();
    return (
      (category === "all" || category === tool.category) &&
      terms.every((term) => searchable.includes(term))
    );
  });

  const normalized = query.trim().toLowerCase();
  const knownTerm =
    tools.find((tool) => tool.name.toLowerCase() === normalized)?.slug ??
    categoryIds.find((id) => categories[id].name.toLowerCase() === normalized);
  const zero = results.length === 0;

  useEffect(() => {
    try {
      sessionStorage.removeItem("toolnest-search");
    } catch {}
    if (!normalized || typeof crypto.randomUUID !== "function") return;
    const timer = window.setTimeout(() => {
      const id = crypto.randomUUID();
      try {
        sessionStorage.setItem("toolnest-search", id);
      } catch {}
      sendAnalytics({ type: "search", id, keyword: knownTerm, zero }).catch(
        () => {},
      );
    }, 650);
    return () => window.clearTimeout(timer);
  }, [normalized, knownTerm, zero]);

  function selectCategory(selection: CategoryId | "all") {
    if (selection !== category) setCategoryChanged(true);
    setCategory(selection);
    const address = new URL(window.location.href);

    if (selection === "all") {
      address.searchParams.delete("category");
    } else {
      address.searchParams.set("category", selection);
    }

    window.history.replaceState(null, "", address);
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-7">
      <aside
        aria-label="Directory filters"
        className="surface p-4 lg:sticky lg:top-24"
      >
        <label className="relative block">
          <span className="sr-only">Search tools</span>
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools…"
            className="pl-9"
          />
        </label>
        <div
          role="group"
          aria-label="Filter by category"
          className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4 lg:grid"
        >
          {(["all", ...categoryIds] as const).map((id) => {
            const Icon = id === "all" ? LayoutGrid : categories[id].icon;
            return (
              <Button
                key={id}
                type="button"
                variant="ghost"
                aria-pressed={category === id}
                onClick={() => selectCategory(id)}
                className={cn(
                  "h-10 justify-start px-2.5 lg:w-full",
                  category === id &&
                    "bg-highlight/12 text-highlight hover:bg-highlight/18",
                )}
              >
                <Icon size={16} className="shrink-0" aria-hidden />
                {id === "all" ? "All categories" : categories[id].name}
              </Button>
            );
          })}
        </div>
      </aside>

      <section className="min-w-0" aria-label="Tool results">
        <div className="mb-4 flex min-h-10 flex-wrap items-center justify-between gap-3">
          <h2
            aria-live="polite"
            className="text-sm font-medium text-muted-foreground"
          >
            {results.length} {results.length === 1 ? "tool" : "tools"}
          </h2>
          {results.some((tool) => tool.slug === "pdf-toolkit") && (
            <Button asChild variant="outline">
              <Link href="/tools/pdf-toolkit?mode=text-to-pdf">
                Text to PDF
              </Link>
            </Button>
          )}
        </div>
        {results.length ? (
          <div
            key={category}
            className={cn(
              "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
              categoryChanged && "tool-directory-enter",
            )}
          >
            {results.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        ) : (
          <div className="surface grid justify-items-center gap-3 p-8 text-center sm:p-12">
            <SearchX className="text-highlight" aria-hidden />
            <p className="font-semibold">No matching tools</p>
            <p className="text-sm text-muted-foreground">
              Try a different search or category.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                selectCategory("all");
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
