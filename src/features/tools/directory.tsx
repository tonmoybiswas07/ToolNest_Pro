"use client";

import { useState } from "react";
import { Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ToolCard } from "./cards";
import { categories, categoryIds, tools, type CategoryId } from "./registry";

export function Directory({ initialCategory }: { initialCategory: CategoryId | "all" }) {
  const [category, setCategory] = useState<CategoryId | "all">(initialCategory);
  const [query, setQuery] = useState("");
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = tools.filter((tool) => {
    const searchable = `${tool.name} ${tool.description} ${categories[tool.category].name}`.toLowerCase();
    return (category === "all" || category === tool.category) && terms.every((term) => searchable.includes(term));
  });

  function selectCategory(selection: CategoryId | "all") {
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
    <>
      <div className="surface space-y-4 p-4 sm:p-5">
        <label className="relative block">
          <span className="sr-only">Search tools</span>
          <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools, e.g. PDF or resize" className="pl-11" />
        </label>
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {(["all", ...categoryIds] as const).map((id) => (
            <Button key={id} type="button" variant="outline" aria-pressed={category === id} onClick={() => selectCategory(id)} className={cn("h-10", category === id && "border-highlight/40 bg-highlight/12 text-highlight hover:bg-highlight/18")}>
              {id === "all" ? "All categories" : categories[id].name}
            </Button>
          ))}
        </div>
      </div>
      <h2 aria-live="polite" className="my-5 text-sm font-medium text-muted-foreground">{results.length} {results.length === 1 ? "tool" : "tools"}</h2>
      {results.length ? (
        <div className="card-grid">{results.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}</div>
      ) : (
        <div className="surface grid justify-items-center gap-3 p-8 text-center sm:p-12">
          <SearchX className="text-highlight" aria-hidden />
          <p className="font-semibold">No matching tools</p>
          <p className="text-sm text-muted-foreground">Try a different search or category.</p>
          <Button variant="outline" onClick={() => { setQuery(""); selectCategory("all"); }}>Clear filters</Button>
        </div>
      )}
    </>
  );
}
