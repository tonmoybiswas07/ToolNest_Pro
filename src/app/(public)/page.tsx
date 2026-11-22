import Link from "next/link";
import { LayoutGrid, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroClock } from "@/features/landing/hero-clock";
import { RecentHomeTools } from "@/features/landing/recent-home-tools";
import { CategoryCard, ToolCard } from "@/features/tools/cards";
import { categoryIds, featuredTools, tools } from "@/features/tools/registry";

export const metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div className="relative z-10">
            <span className="eyebrow"><Sparkles size={15} aria-hidden /> The all-in-one toolkit</span>
            <h1 className="hero-title">Everyday tools.<br /><span>One workspace.</span></h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">Explore {tools.length} tools for images, PDFs, code, design, and the tasks in between.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild><Link href="/tools"><LayoutGrid size={17} aria-hidden /> Browse tools</Link></Button>
              <Button variant="outline" size="lg" asChild><Link href="#categories">View categories</Link></Button>
            </div>
          </div>
          <HeroClock toolCount={tools.length} categoryCount={categoryIds.length} />
        </div>
      </section>
      <RecentHomeTools />
      <section className="shell section-space" aria-labelledby="featured-heading">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="featured-heading" className="section-title">Featured tools</h2>
            <p className="mt-2 text-muted-foreground">Explore available and upcoming tools.</p>
          </div>
          <Button asChild variant="outline"><Link href="/tools">View all tools</Link></Button>
        </div>
        <div className="card-grid">{featuredTools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}</div>
      </section>
      <section id="categories" className="border-t border-border bg-card/35">
        <div className="shell section-space">
          <h2 className="section-title">Browse by category</h2>
          <div className="card-grid mt-7">{categoryIds.map((id) => <CategoryCard key={id} category={id} />)}</div>
        </div>
      </section>
    </>
  );
}
