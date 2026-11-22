import type { Metadata } from "next";
import { Directory } from "@/features/tools/directory";
import { categoryIds } from "@/features/tools/registry";

export const metadata: Metadata = {
  title: "Tools Directory",
  alternates: { canonical: "/tools" },
  description: "Search the ToolNest Pro catalog and explore tools by category.",
};

export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const { category } = await searchParams;
  const initialCategory = categoryIds.find((id) => id === category) ?? "all";

  return (
    <section className="shell section-space">
      <div className="mb-8 max-w-2xl">
        <h1 className="page-title">Tools directory</h1>
        <p className="mt-3 text-lg text-muted-foreground">Find tools for images, documents, code, and more.</p>
      </div>
      <Directory key={initialCategory} initialCategory={initialCategory} />
    </section>
  );
}
