import { collections } from "@/features/student/collections";
import { toolHref } from "@/features/tools/registry";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
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

export function FolderCard({
  href,
  tone,
  className,
  children,
}: {
  href: string;
  tone?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      data-tone={tone}
      className={cn(
        "folder-card group flex h-full min-w-0 flex-col",
        className,
      )}
    >
      <div className="folder-card-face flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        {children}
      </div>
    </Link>
  );
}

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  const tone =
    tool.category === "student"
      ? collections.find((group) => group.slugs.includes(tool.slug))?.tone
      : undefined;

  return (
    <FolderCard href={toolHref(tool)} tone={tone} className="tool-catalog-card">
      <span className="mb-4 flex items-center justify-between gap-3">
        <span className="tool-catalog-icon" data-tone={tone}>
          <Icon size={20} aria-hidden />
        </span>
        <ArrowUpRight
          size={17}
          className="shrink-0 text-muted-foreground group-hover:text-highlight"
          aria-hidden
        />
      </span>
      <h3 className="font-semibold leading-snug">{tool.name}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
        {tool.description}
      </p>
      <span className="mt-3 block empty:hidden">
        <ToolLoginBadge slug={tool.slug} />
        {tool.status === "Requires Setup" && (
          <span className="status-pill">{tool.status}</span>
        )}
      </span>
    </FolderCard>
  );
}

export function CategoryCard({ category }: { category: CategoryId }) {
  const { icon: Icon, name, description, tone } = categories[category];
  const count = tools.filter((tool) => tool.category === category).length;

  return (
    <FolderCard href={`/tools?category=${category}`}>
      <div className="flex items-start gap-3">
        <span className="tile-icon" data-tone={tone}>
          <Icon size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <p className="mt-2 text-sm font-medium text-highlight">
            {count} tools
          </p>
        </div>
        <ArrowUpRight
          size={16}
          className="shrink-0 text-muted-foreground group-hover:text-highlight"
          aria-hidden
        />
      </div>
    </FolderCard>
  );
}
