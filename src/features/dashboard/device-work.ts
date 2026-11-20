import { z } from "zod";
import type { Artifact } from "../tools/file-processing/files";

const settingsSchema = z.discriminatedUnion("slug", [
  z
    .object({
      slug: z.literal("image-resizer"),
      width: z.number().int().min(1).max(8192),
      height: z.number().int().min(1).max(8192),
      format: z.enum(["image/png", "image/jpeg", "image/webp"]),
      quality: z.number().min(0).max(1),
      background: z.string().regex(/^#[0-9a-f]{6}$/i),
    })
    .refine((row) => row.width * row.height <= 16000000),
  z.object({
    slug: z.literal("pdf-compressor"),
    raster: z.boolean(),
    quality: z.number().int().min(20).max(95),
    limit: z.number().int().min(0).max(30720).default(0),
  }),
]);
export type ToolSettings = z.infer<typeof settingsSchema>;
export const workflowIds = ["resize-compress", "merge-check"] as const;
export type WorkflowId = (typeof workflowIds)[number];

const storeSchema = z.object({
  recent: z.array(settingsSchema).max(2),
  presets: z
    .array(
      z.object({
        id: z.uuid(),
        name: z.string().min(1).max(70),
        settings: settingsSchema,
      }),
    )
    .max(40),
  pinned: z.array(z.enum(workflowIds)).max(2),
  results: z.object({
    files: z.number().int().nonnegative(),
    saved: z.number().int().nonnegative(),
  }),
});

export const deviceWorkKey = "toolnest-device-work-v1";
export const emptyDeviceWork: z.infer<typeof storeSchema> = {
  recent: [],
  presets: [],
  pinned: [],
  results: { files: 0, saved: 0 },
};

export function readDeviceWork() {
  try {
    const parsed = storeSchema.safeParse(
      JSON.parse(localStorage.getItem(deviceWorkKey) ?? "null"),
    );
    if (parsed.success) return parsed.data;
  } catch {}
  return emptyDeviceWork;
}

export function updateDeviceWork(
  edit: (work: typeof emptyDeviceWork) => typeof emptyDeviceWork,
) {
  try {
    const next = storeSchema.parse(edit(readDeviceWork()));
    localStorage.setItem(deviceWorkKey, JSON.stringify(next));
    window.dispatchEvent(new Event(deviceWorkKey));
    return true;
  } catch {
    return false;
  }
}

export function initialToolSettings<T extends ToolSettings["slug"]>(slug: T) {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const work = readDeviceWork();
  const id = params.get("preset");
  const selected = id
    ? work.presets.find((item) => item.id === id)?.settings
    : params.has("resume")
      ? work.recent.find((item) => item.slug === slug)
      : undefined;
  return selected?.slug === slug
    ? (selected as Extract<ToolSettings, { slug: T }>)
    : undefined;
}

export function rememberSettings(settings: ToolSettings) {
  updateDeviceWork((work) => ({
    ...work,
    recent: [
      settings,
      ...work.recent.filter((item) => item.slug !== settings.slug),
    ],
  }));
}

export function recordFileResults(artifacts: Artifact[]) {
  const saved = artifacts.reduce((total, file) => {
    const before = file.originalBytes ?? file.source?.size;
    return (
      total + (before === undefined ? 0 : Math.max(0, before - file.blob.size))
    );
  }, 0);
  updateDeviceWork((work) => ({
    ...work,
    results: {
      files: work.results.files + artifacts.length,
      saved: work.results.saved + saved,
    },
  }));
}

export function isToolSettings(value: unknown): value is ToolSettings {
  return settingsSchema.safeParse(value).success;
}

export function settingsLabel(settings: ToolSettings) {
  if (settings.slug === "image-resizer")
    return `${settings.width} × ${settings.height} · ${settings.format.slice(6).toUpperCase()}`;
  return [
    settings.raster ? `Image-only · ${settings.quality}% JPEG` : "Repack PDF",
    settings.limit > 0 ? `${settings.limit} KB target` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
