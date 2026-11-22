import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { collections } from "@/features/student/collections";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ToolControls } from "@/features/analytics/tool-controls";
import { loadStudent } from "@/features/student/server";
import { StudentTool } from "@/features/student/tools";
import { StudentWorkspace } from "@/features/student/workspace";
import {
  signInOnlyTools,
  studentTools,
  toolHref,
} from "@/features/tools/registry";

import { authHref, toolDestination } from "@/features/auth/tool-return";
import { getSession } from "@/lib/session";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
function getTool(slug: string) {
  return studentTools.find((tool) => tool.slug === slug) ?? notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = getTool((await params).slug);
  return {
    title: tool.name,
    description: tool.description,
    alternates: { canonical: toolHref(tool) },
    robots: signInOnlyTools.has(tool.slug) ? { index: false } : undefined,
  };
}

export default async function Page({ params, searchParams }: Props) {
  const tool = getTool((await params).slug);
  if (signInOnlyTools.has(tool.slug) && !(await getSession())) {
    redirect(
      authHref("/login", toolDestination(toolHref(tool), await searchParams)),
    );
  }
  const snapshot = await loadStudent();
  const configured = Boolean(
    (process.env.STUDENT_OPENAI_API_KEY && process.env.STUDENT_OPENAI_MODEL) ||
    process.env.GEMINI_API_KEY ||
    process.env.STUDENT_GEMINI_API_KEY,
  );
  return (
    <>
      <header className="student-masthead mb-6 p-5 sm:p-8">
        <Link
          href={`/student/tools#collection-${collections.findIndex((group) => group.slugs.includes(tool.slug))}`}
          className="student-text-link inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} aria-hidden /> Student tools
        </Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <span className="student-tool-icon mt-1">
              <tool.icon size={22} aria-hidden />
            </span>
            <div>
              <h1 className="student-display text-3xl sm:text-4xl">
                {tool.name}
              </h1>
              <p className="mt-2 max-w-prose text-sm text-muted-foreground sm:text-base">
                {tool.description}
              </p>
            </div>
          </div>
          <ToolControls slug={tool.slug} />
        </div>
      </header>
      <StudentWorkspace key={tool.slug} snapshot={snapshot} slug={tool.slug}>
        <StudentTool
          slug={tool.slug}
          configured={configured}
          signedIn={!!snapshot.owner}
        />
      </StudentWorkspace>
    </>
  );
}
