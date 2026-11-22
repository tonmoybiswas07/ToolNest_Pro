"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { StudioProps } from "./shared";

const loading = () => (
  <div role="status" className="surface mt-8 p-6 text-muted-foreground">
    Loading workspace…
  </div>
);

const imageEssentials = dynamic(() => import("../file-processing/image-essentials"), { ssr: false, loading });
const advancedImages = dynamic(() => import("../file-processing/advanced-image"), { ssr: false, loading });
const pdfWorkspaces = dynamic(() => import("../file-processing/pdf-workspaces"), { ssr: false, loading });

const textWorkspaces = dynamic(() => import("./text-workspaces"), { ssr: false, loading });
const calculators = dynamic(() => import("./calculators"), { ssr: false, loading });
const imageWorkspaces = dynamic(() => import("./image-workspaces"), { ssr: false, loading });
const socialVideoDownloader = dynamic(() => import("./social-video-downloader"), { ssr: false, loading });

const studios: Record<string, ComponentType<StudioProps>> = {
  "json-to-csv": textWorkspaces,
  "url-query-parser": textWorkspaces,
  "html-entity-converter": textWorkspaces,
  "line-sorter": textWorkspaces,
  "text-cleaner": textWorkspaces,
  "number-base-converter": calculators,
  "loan-calculator": calculators,
  "date-difference-calculator": calculators,
  "tip-calculator": calculators,
  "aspect-ratio-calculator": calculators,
  "duration-calculator": calculators,
  "image-color-picker": imageWorkspaces,
  "favicon-generator": imageWorkspaces,
  "contrast-checker": imageWorkspaces,
  "image-inspector": imageWorkspaces,
  "instagram-video-downloader": socialVideoDownloader,
  "tiktok-video-downloader": socialVideoDownloader,
  "threads-video-downloader": socialVideoDownloader,
  "url-encoder": dynamic(() => import("../utilities/text-tools").then(module => module.UrlTool), { ssr: false, loading }),
  "word-counter": dynamic(() => import("../utilities/text-tools").then(module => module.WordTool), { ssr: false, loading }),
  "case-converter": dynamic(() => import("../utilities/text-tools").then(module => module.CaseTool), { ssr: false, loading }),
  "color-converter": dynamic(() => import("../utilities/text-tools").then(module => module.ColorTool), { ssr: false, loading }),
  "unit-converter": dynamic(() => import("../utilities/number-tools").then(module => module.UnitTool), { ssr: false, loading }),
  "percentage-calculator": dynamic(() => import("../utilities/number-tools").then(module => module.PercentTool), { ssr: false, loading }),
  "timestamp-converter": dynamic(() => import("../utilities/number-tools").then(module => module.TimeTool), { ssr: false, loading }),
  "hash-generator": dynamic(() => import("../utilities/crypto-tools").then(module => module.HashTool), { ssr: false, loading }),
  "password-generator": dynamic(() => import("../utilities/crypto-tools").then(module => module.PasswordTool), { ssr: false, loading }),
  "uuid-generator": dynamic(() => import("../utilities/crypto-tools").then(module => module.UuidTool), { ssr: false, loading }),
  "image-compressor": imageEssentials,
  "image-converter": imageEssentials,
  "image-resizer": imageEssentials,
  "background-remover": advancedImages,
  "image-editor": advancedImages,
  "social-media-image-studio": advancedImages,
  "pdf-merger": pdfWorkspaces,
  "pdf-splitter": pdfWorkspaces,
  "pdf-compressor": pdfWorkspaces,
  "pdf-toolkit": pdfWorkspaces,
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
  "base64-studio": dynamic(() => import("./base64-studio"), {
    ssr: false,
    loading,
  }),
  "markdown-preview": dynamic(() => import("./markdown-preview"), {
    ssr: false,
    loading,
  }),
  "lorem-ipsum-generator": dynamic(() => import("./lorem-ipsum"), {
    ssr: false,
    loading,
  }),
  "box-shadow-generator": dynamic(() => import("./box-shadow-generator"), {
    ssr: false,
    loading,
  }),
  "typography-scale": dynamic(() => import("./typography-scale"), {
    ssr: false,
    loading,
  }),
  "http-status-reference": dynamic(() => import("./http-status-reference"), {
    ssr: false,
    loading,
  }),
  "cron-builder": dynamic(() => import("./cron-builder"), {
    ssr: false,
    loading,
  }),
};

export function Studio({ slug }: StudioProps) {
  const Component = studios[slug];
  return Component ? <Component slug={slug} /> : null;
}
