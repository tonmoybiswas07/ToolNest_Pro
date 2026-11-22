import type { MetadataRoute } from "next";
import { signInOnlyTools, toolHref, tools } from "@/features/tools/registry";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/tools",
    "/student",
    "/student/tools",
    ...tools.filter((tool) => !signInOnlyTools.has(tool.slug)).map(toolHref),
  ];
  return [...new Set(paths)].map((path) => ({ url: new URL(path, siteUrl()).href }));
}
