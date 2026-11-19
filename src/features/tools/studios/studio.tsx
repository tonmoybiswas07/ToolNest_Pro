"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { StudioProps } from "./shared";

const loading = () => (
  <div role="status" className="surface mt-8 p-6 text-muted-foreground">
    Loading workspace…
  </div>
);

const studios: Record<string, ComponentType<StudioProps>> = {
  "json-studio": dynamic(() => import("./json-studio"), {
    ssr: false,
    loading,
  }),
  "jwt-inspector": dynamic(() => import("./jwt-inspector"), {
    ssr: false,
    loading,
  }),
  "regex-lab": dynamic(() => import("./regex-lab"), { ssr: false, loading }),
  "code-diff-studio": dynamic(() => import("./code-diff-studio"), {
    ssr: false,
    loading,
  }),
  "gradient-studio": dynamic(() => import("./gradient-studio"), {
    ssr: false,
    loading,
  }),
  "color-system-generator": dynamic(() => import("./color-system"), {
    ssr: false,
    loading,
  }),
  "glassmorphism-builder": dynamic(() => import("./glassmorphism"), {
    ssr: false,
    loading,
  }),
  "qr-code-studio": dynamic(() => import("./qr-studio"), {
    ssr: false,
    loading,
  }),
  "prompt-builder": dynamic(() => import("./prompt-builder"), {
    ssr: false,
    loading,
  }),
  "smart-notes-studio": dynamic(() => import("./notes-studio"), {
    ssr: false,
    loading,
  }),
};

export function Studio({ slug }: StudioProps) {
  const Component = studios[slug];
  return Component ? <Component slug={slug} /> : null;
}
