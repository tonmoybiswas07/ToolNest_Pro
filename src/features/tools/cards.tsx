import { toolHref } from "@/features/tools/registry";
import Link from "next/link";
import { ChevronRight, LockKeyhole } from "lucide-react";
import {
  categories,
  signInOnlyTools,
  tools,
  type CategoryId,
  type Tool,
} from "./registry";

export function ToolLoginBadge({ slug }: { slug: string }) {
  if (!signInOnlyTools.has(slug)) return null;
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-highlight/30 bg-highlight/10 px-2 py-1 text-xs leading-tight font-semibold text-highlight">
      <LockKeyhole size={13} className="shrink-0" aria-hidden />
      Login required
    </span>
  );
}

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;

  return (
    <Link
      href={toolHref(tool)}
      className="surface interactive-card flex h-full flex-col p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="tile-icon" data-tone={categories[tool.category].tone}>
          <Icon size={21} aria-hidden />
        </span>
        {signInOnlyTools.has(tool.slug) ? (
          <ToolLoginBadge slug={tool.slug} />
        ) : (
          <span className="status-pill">{tool.status}</span>
        )}
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight">{tool.name}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
        {tool.description}
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
        {categories[tool.category].name}
        <ChevronRight size={15} aria-hidden />
      </div>
    </Link>
  );
}

export function CategoryCard({ category }: { category: CategoryId }) {
  const { icon: Icon, name, description, tone } = categories[category];
  const count = tools.filter((tool) => tool.category === category).length;

  return (
    <Link
      href={`/tools?category=${category}`}
      className="surface interactive-card flex h-full items-start gap-4 p-4 sm:p-5"
    >
      <span className="tile-icon" data-tone={tone}>
        <Icon size={20} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{name}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <p className="mt-2 text-sm font-medium text-highlight">{count} tools</p>
      </div>
    </Link>
  );
}
