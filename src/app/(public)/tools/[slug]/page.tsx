import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolDetail } from "@/features/tools/tool-detail";
import { tools } from "@/features/tools/registry";

type ToolPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return tools.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = tools.find((entry) => entry.slug === slug);
  if (!tool) notFound();

  return { title: `${tool.name} — Coming Soon`, description: tool.description };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = tools.find((entry) => entry.slug === slug);
  if (!tool) notFound();

  return <ToolDetail tool={tool} />;
}
