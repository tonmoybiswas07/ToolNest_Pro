"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Field, Notice, selectClass } from "../studios/shared";
import { Picker, Slider } from "../studios/design-controls";
import { FilePreview, useObjectUrl } from "./workspace";
import { imageFormats, type Artifact } from "./files";
import type { Crop, ImageOptions } from "./image-engine";
import { workerJob } from "./worker-job";

export const acceptImages = imageFormats.join(",");
export const imageLimits =
  "JPG, PNG, or WebP. Images are limited to 8,192 px per side and 16 megapixels.";
export const imageNames = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

export function imageJob(
  file: File,
  options: ImageOptions,
  signal: AbortSignal,
) {
  const worker = new Worker(new URL("./image.worker.ts", import.meta.url), {
    type: "module",
  });
  return workerJob<Artifact>(worker, { file, options }, signal);
}

export function ExportPanel({
  options,
  change,
  original = false,
}: {
  options: ImageOptions;
  change: (options: ImageOptions) => void;
  original?: boolean;
}) {
  return (
    <div className="space-y-3">
      <Field label="Output format">
        <select
          className={selectClass}
          value={options.format}
          onChange={(event) =>
            change({
              ...options,
              format: event.target.value as ImageOptions["format"],
            })
          }
        >
          {original && <option value="original">Keep source format</option>}
          {imageFormats.map((format) => (
            <option key={format} value={format}>
              {imageNames[format]}
            </option>
          ))}
        </select>
      </Field>
      {options.format !== "image/png" && (
        <Slider
          label="JPEG / WebP quality"
          value={Math.round(options.quality * 100)}
          min={10}
          max={100}
          unit="%"
          change={(value) => change({ ...options, quality: value / 100 })}
        />
      )}
      {options.format !== "image/jpeg" && (
        <Notice>
          PNG uses lossless encoding. Its size may increase, and the quality
          slider does not affect it.
        </Notice>
      )}
      {(options.format === "image/jpeg" || options.format === "original") && (
        <>
          <Field label="JPEG background">
            <Input
              type="color"
              value={options.background}
              onChange={(event) =>
                change({ ...options, background: event.target.value })
              }
            />
          </Field>
          <Notice>
            JPEG has no transparency. Transparent pixels are filled with the
            chosen background.
          </Notice>
        </>
      )}
    </div>
  );
}

export function clampCrop(crop: Crop): Crop {
  const width = Math.max(1, Math.min(100, crop.width)),
    height = Math.max(1, Math.min(100, crop.height));
  return {
    width,
    height,
    x: Math.max(0, Math.min(100 - width, crop.x)),
    y: Math.max(0, Math.min(100 - height, crop.y)),
  };
}

export function CropArea({
  file,
  crop,
  setCrop,
  disabled,
}: {
  file: File;
  crop: Crop;
  setCrop: (crop: Crop) => void;
  disabled?: boolean;
}) {
  const url = useObjectUrl(file);
  const [drag, setDrag] = useState<{ x: number; y: number; crop: Crop }>();
  return (
    <div className="space-y-3">
      {url && (
        <div
          className="relative mx-auto w-fit max-w-full touch-none overflow-hidden rounded-xl border border-border"
          onPointerDown={(event) => {
            if (disabled) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            setDrag({ x: event.clientX, y: event.clientY, crop });
          }}
          onPointerMove={(event) => {
            if (!drag || disabled) return;
            const box = event.currentTarget.getBoundingClientRect();
            setCrop(
              clampCrop({
                ...drag.crop,
                x: Math.round(
                  drag.crop.x + ((event.clientX - drag.x) * 100) / box.width,
                ),
                y: Math.round(
                  drag.crop.y + ((event.clientY - drag.y) * 100) / box.height,
                ),
              }),
            );
          }}
          onPointerUp={() => setDrag(undefined)}
          onPointerCancel={() => setDrag(undefined)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            draggable={false}
            alt="Original image with crop guide"
            className="block max-h-64 max-w-full"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute border-2 border-white shadow-[0_0_0_100vmax_rgba(0,0,0,.5)]"
            style={{
              left: `${crop.x}%`,
              top: `${crop.y}%`,
              width: `${crop.width}%`,
              height: `${crop.height}%`,
            }}
          />
        </div>
      )}
      <Notice>Drag the crop area or use the sliders.</Notice>
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["x", "Crop left"],
            ["y", "Crop top"],
            ["width", "Crop width"],
            ["height", "Crop height"],
          ] as const
        ).map(([key, label]) => (
          <Slider
            key={key}
            label={label}
            value={crop[key]}
            min={key === "x" || key === "y" ? 0 : 1}
            unit="%"
            change={(value) => setCrop(clampCrop({ ...crop, [key]: value }))}
          />
        ))}
      </div>
    </div>
  );
}

export function ColorControl({
  value,
  change,
}: {
  value: string;
  change: (value: string) => void;
}) {
  return <Picker label="Canvas background" value={value} change={change} />;
}

export function OriginalPreview({ file }: { file?: File }) {
  return file && <FilePreview blob={file} label="Original image" />;
}
