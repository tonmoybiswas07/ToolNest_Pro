import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { categories, findTool, toolHref } from "@/features/tools/registry";

const tasks = [
  ["pdf-compressor", "Shrink a PDF"],
  ["image-resizer", "Resize an image"],
  ["assignment-tracker", "Track assignment deadlines"],
  ["exam-study-planner", "Plan for an exam"],
] as const;

export function HomeTasks() {
  return (
    <section className="shell pt-12 sm:pt-16" aria-labelledby="task-heading">
      <h2 id="task-heading" className="section-title mb-5">Start with a task</h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tasks.map(([slug, label]) => {
          const tool = findTool(slug);
          if (!tool) return null;

          return (
            <li key={slug}>
              <Link href={toolHref(tool)} className="surface interactive-card flex h-full items-center gap-3 p-4">
                <span className="tile-icon" data-tone={categories[tool.category].tone}><tool.icon size={20} aria-hidden /></span>
                <span className="flex-1 font-medium">{label}</span>
                <ArrowUpRight size={15} className="shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
