import Link from "next/link";
import { Clock3 } from "lucide-react";
import { ToolControls } from "@/features/analytics/tool-controls";
import { Studio } from "./studios/studio";
import { Button } from "@/components/ui/button";
import { ToolCard } from "./cards";
import { categories, tools, type Tool } from "./registry";

export function ToolDetail({ tool }: { tool: Tool }) {
  const category = categories[tool.category];
  const Icon = tool.icon;
  const related = tools
    .filter(
      (entry) => entry.category === tool.category && entry.slug !== tool.slug,
    )
    .slice(0, 3);

  return (
    <div className="shell section-space">
      <nav
        aria-label="Breadcrumb"
        className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
      >
        <Link href="/tools" className="hover:text-foreground">
          Tools
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/tools?category=${tool.category}`}
          className="hover:text-foreground"
        >
          {category.name}
        </Link>
      </nav>
      <div className="max-w-3xl">
        <span className="tile-icon" data-tone={category.tone}>
          <Icon size={24} aria-hidden />
        </span>
        <h1 className="page-title mt-5">{tool.name}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{tool.description}</p>
      </div>
      <div className="mt-5">
        <ToolControls key={tool.slug} slug={tool.slug} previousSlug={tool.previousSlug} />
      </div>
      {tool.status === "Available" ? <Studio slug={tool.slug} /> : <section
        className="surface mt-8 grid justify-items-center gap-4 px-5 py-12 text-center sm:py-16"
        aria-labelledby="availability"
      >
        <span className="tile-icon">
          <Clock3 size={22} aria-hidden />
        </span>
        <h2 id="availability" className="text-2xl font-semibold tracking-tight">
          {tool.status}
        </h2>
        <p className="max-w-sm text-muted-foreground">
          This tool is planned for a future release.
        </p>
        <Button variant="outline" asChild>
          <Link href="/tools">Explore the catalog</Link>
        </Button>
      </section>}
      <section className="mt-12" aria-labelledby="related">
        <h2 id="related" className="section-title mb-5">
          More in {category.name}
        </h2>
        <div className="card-grid">
          {related.map((entry) => (
            <ToolCard key={entry.slug} tool={entry} />
          ))}
        </div>
      </section>
    </div>
  );
}
