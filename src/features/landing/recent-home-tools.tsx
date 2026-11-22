"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { findTool, toolHref, type Tool } from "@/features/tools/registry";
import { authClient } from "@/lib/auth-client";
import { HomeTasks } from "./home-tasks";

function resolveTools(slugs: unknown): Tool[] {
  if (!Array.isArray(slugs)) return [];
  return slugs.flatMap(slug => {
    const tool = typeof slug === "string" ? findTool(slug) : undefined;
    return tool?.status === "Available" ? [tool] : [];
  });
}

function SignedInHomeTasks() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [favorites, setFavorites] = useState<Tool[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/analytics/recent", { signal: controller.signal });
        if (!response.ok) return;
        const result = await response.json();
        if (!controller.signal.aborted) {
          setTools(resolveTools(result.slugs));
          setFavorites(resolveTools(result.favorites));
        }
      } catch {
        // Default tasks stay available when account history is unavailable.
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  return (
    <>
      <HomeTasks favorites={favorites} recent={tools.slice(0, 2)} />
      {tools.length > 0 && (
        <section className="shell pt-10" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="mb-3 text-xl font-semibold">Recently used tools</h2>
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {tools.map(tool => (
              <li key={tool.slug} className="border-b border-border">
                <Link className="flex items-center gap-3 px-2 py-3 text-sm font-medium hover:bg-accent" href={toolHref(tool)}>
                  <tool.icon size={17} className="shrink-0 text-highlight" aria-hidden />
                  <span className="flex-1">{tool.name}</span>
                  <ArrowRight size={15} className="shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export function RecentHomeTools() {
  const { data: session } = authClient.useSession();
  return session?.user.id ? <SignedInHomeTasks key={session.user.id} /> : <HomeTasks />;
}
