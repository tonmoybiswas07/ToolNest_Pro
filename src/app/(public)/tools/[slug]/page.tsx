import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ToolDetail } from "@/features/tools/tool-detail";
import { tools } from "@/features/tools/registry";

type ToolPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return tools.flatMap(({ slug, previousSlug }) => previousSlug ? [{ slug }, { slug: previousSlug }] : [{ slug }]);
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = tools.find((entry) => entry.slug === slug || entry.previousSlug === slug);
  if (!tool) notFound();

  return { title: tool.status === "Available" ? tool.name : `${tool.name} — Coming Soon`, description: tool.description };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = tools.find((entry) => entry.slug === slug || entry.previousSlug === slug);
  if (!tool) notFound();

  if (slug !== tool.slug) permanentRedirect(`/tools/${tool.slug}`);
  return <ToolDetail tool={tool} />;
}
