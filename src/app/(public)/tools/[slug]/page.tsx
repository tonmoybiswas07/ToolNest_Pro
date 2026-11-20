import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { ToolDetail } from "@/features/tools/tool-detail";
import {
  findTool,
  legacyToolRoutes,
  retiredTools,
  signInOnlyTools,
  toolHref,
  tools,
} from "@/features/tools/registry";

import { getSession } from "@/lib/session";
import { authHref, toolDestination } from "@/features/auth/tool-return";

type ToolPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...tools.map((tool) => tool.slug),
    ...legacyToolRoutes.keys(),
    ...retiredTools.map((tool) => tool.slug),
  ].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = findTool(slug);
  if (!tool && retiredTools.some((entry) => entry.slug === slug))
    permanentRedirect("/tools");
  if (!tool) notFound();

  return {
    title:
      tool.status === "Available" ? tool.name : `${tool.name} — Requires Setup`,
    description: tool.description,
  };
}

export default async function ToolPage({
  params,
  searchParams,
}: ToolPageProps) {
  const { slug } = await params;
  const tool = findTool(slug);
  if (!tool && retiredTools.some((entry) => entry.slug === slug))
    permanentRedirect("/tools");
  if (!tool) notFound();

  if (slug !== tool.slug) {
    const mode = legacyToolRoutes.get(slug)?.mode;
    permanentRedirect(`/tools/${tool.slug}${mode ? `?mode=${mode}` : ""}`);
  }
  if (tool.category === "student") permanentRedirect(toolHref(tool));
  if (signInOnlyTools.has(tool.slug) && !(await getSession())) {
    redirect(
      authHref("/login", toolDestination(toolHref(tool), await searchParams)),
    );
  }
  return <ToolDetail tool={tool} />;
}
