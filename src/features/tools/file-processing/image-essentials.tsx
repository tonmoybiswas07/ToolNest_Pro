"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Actions,
  Field,
  Notice,
  selectClass,
  type StudioProps,
} from "../studios/shared";
import {
  acceptImages,
  clampCrop,
  CropArea,
  ExportPanel,
  imageJob,
  imageLimits,
  OriginalPreview,
} from "./image-controls";
import {
  cropPixels,
  defaultImageOptions,
  fullCrop,
  type Crop,
  type ImageOptions,
} from "./image-engine";
import {
  boundedDimensions,
  inspectImage,
  MiB,
  type Artifact,
  type ImageInfo,
} from "./files";
import {
  FileDropzone,
  FileOrder,
  FileWorkspace,
  useFileJob,
} from "./workspace";

export default function ImageEssentials({ slug }: StudioProps) {
  const resize = slug === "image-resizer";
  const compress = slug === "image-compressor";
  const [files, setFiles] = useState<File[]>([]);
  const [info, setInfo] = useState<ImageInfo>();
  const [inputError, setInputError] = useState("");
  const [checking, setChecking] = useState(false);
  const [options, setOptions] = useState<ImageOptions>({
    ...defaultImageOptions,
    format: compress ? "original" : "image/png",
  });
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [scale, setScale] = useState("100");
  const [locked, setLocked] = useState(true);
  const [cropEnabled, setCropEnabled] = useState(false);
  const [crop, setCrop] = useState<Crop>(fullCrop);
  const job = useFileJob(slug);
  const disabled = job.busy || checking;

  async function select(input: File[]) {
    job.clear();
    setInputError("");
    setChecking(true);
    try {
      const valid = await Promise.all(input.map(inspectImage));
      if (resize) {
        const bitmap = await createImageBitmap(input[0]).catch(() => {
          throw new Error("The image decoder could not open this file.");
        });
        try {
          boundedDimensions(bitmap.width, bitmap.height);
          valid[0] = {
            ...valid[0],
            width: bitmap.width,
            height: bitmap.height,
          };
        } finally {
          bitmap.close();
        }
      }
      setFiles(input);
      setInfo(valid[0]);
      setWidth(String(valid[0].width));
      setHeight(String(valid[0].height));
      setScale("100");
      setCrop(fullCrop);
    } catch (error) {
      setFiles([]);
      setInfo(undefined);
      setInputError(error instanceof Error ? error.message : "Invalid image.");
    } finally {
      setChecking(false);
    }
  }

  function resizeWidth(value: string) {
    setWidth(value);
    if (info && locked && Number(value) > 0) {
      const size = cropPixels(
        info.width,
        info.height,
        cropEnabled ? crop : fullCrop,
      );
      setHeight(
        String(Math.max(1, Math.round((Number(value) * size.h) / size.w))),
      );
    }
  }
  function resizeHeight(value: string) {
    setHeight(value);
    if (info && locked && Number(value) > 0) {
      const size = cropPixels(
        info.width,
        info.height,
        cropEnabled ? crop : fullCrop,
      );
      setWidth(
        String(Math.max(1, Math.round((Number(value) * size.w) / size.h))),
      );
    }
  }
  function updateCrop(next: Crop, enabled = cropEnabled) {
    setCrop(next);
    if (info && locked) {
      const { w, h } = cropPixels(
        info.width,
        info.height,
        enabled ? next : fullCrop,
      );
      setWidth(String(w));
      setHeight(String(h));
    }
  }

  function process() {
    void job.run(async ({ signal, progress }) => {
      if (resize) boundedDimensions(Number(width), Number(height));
      const results: Artifact[] = [];
      let total = 0;
      for (let i = 0; i < files.length; i++) {
        signal.throwIfAborted();
        progress(`Processing image ${i + 1} of ${files.length}…`);
        const file = files[i];
        const result = await imageJob(
          file,
          {
            ...options,
            ...(resize
              ? {
                  width: Number(width),
                  height: Number(height),
                  crop: cropEnabled ? crop : undefined,
                }
              : {}),
          },
          signal,
        );
        total += result.blob.size;
        if (total > 96 * MiB)
          throw new Error(
            "The outputs exceed 96 MB. Process fewer files or use a smaller output.",
          );
        results.push({ ...result, source: file });
      }
      return results;
    });
  }

  return (
    <FileWorkspace job={job} notice={imageLimits}>
      <FileDropzone
        label="Choose images"
        accept={acceptImages}
        multiple={!resize}
        max={resize ? 1 : 12}
        fileMiB={20}
        totalMiB={60}
        disabled={disabled}
        acceptFiles={(input) => void select(input)}
      />
      {checking && <Notice>Validating image headers…</Notice>}
      {inputError && <Notice error>{inputError}</Notice>}
      {!resize && files.length > 0 && (
        <FileOrder
          rows={files}
          setRows={(rows) => {
            setFiles(rows);
            job.clear();
          }}
          disabled={disabled}
        />
      )}
      {files.length > 0 && !(resize && cropEnabled) && (
        <OriginalPreview file={files[0]} />
      )}
      <fieldset disabled={disabled} className="space-y-4">
        {resize && info && (
          <>
            <Notice>
              Original: {info.width} × {info.height} px. Unlock the ratio for
              intentional stretching.
            </Notice>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={locked}
                onChange={(event) => {
                  setLocked(event.target.checked);
                  if (event.target.checked && Number(width) > 0) {
                    const size = cropPixels(
                      info.width,
                      info.height,
                      cropEnabled ? crop : fullCrop,
                    );
                    setHeight(
                      String(
                        Math.max(
                          1,
                          Math.round((Number(width) * size.h) / size.w),
                        ),
                      ),
                    );
                  }
                }}
              />{" "}
              Lock aspect ratio
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Width (px)">
                <Input
                  type="number"
                  min={1}
                  max={8192}
                  value={width}
                  onChange={(event) => resizeWidth(event.target.value)}
                />
              </Field>
              <Field label="Height (px)">
                <Input
                  type="number"
                  min={1}
                  max={8192}
                  value={height}
                  onChange={(event) => resizeHeight(event.target.value)}
                />
              </Field>
            </div>
            <Field label="Scale percentage">
              <Input
                type="number"
                min={1}
                max={400}
                value={scale}
                onChange={(event) => {
                  const value = event.target.value;
                  setScale(value);
                  if (Number(value) > 0) {
                    const { w, h } = cropPixels(
                      info.width,
                      info.height,
                      cropEnabled ? crop : fullCrop,
                    );
                    setWidth(
                      String(
                        Math.max(1, Math.round((w * Number(value)) / 100)),
                      ),
                    );
                    setHeight(
                      String(
                        Math.max(1, Math.round((h * Number(value)) / 100)),
                      ),
                    );
                  }
                }}
              />
            </Field>
            <Field label="Resize preset">
              <select
                className={selectClass}
                value=""
                onChange={(event) => {
                  const max = Number(event.target.value);
                  if (!max) return;
                  const { w, h } = cropPixels(
                    info.width,
                    info.height,
                    cropEnabled ? crop : fullCrop,
                  );
                  const ratio = max / Math.max(w, h);
                  setWidth(String(Math.max(1, Math.round(w * ratio))));
                  setHeight(String(Math.max(1, Math.round(h * ratio))));
                }}
              >
                <option value="">Select long edge</option>
                <option value="640">640 px</option>
                <option value="1080">1,080 px</option>
                <option value="1920">1,920 px</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cropEnabled}
                onChange={(event) => {
                  setCropEnabled(event.target.checked);
                  updateCrop(crop, event.target.checked);
                }}
              />{" "}
              Crop before resizing
            </label>
            {cropEnabled && (
              <>
                <Field label="Crop aspect ratio">
                  <select
                    value=""
                    className={selectClass}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      const ratio = Number(event.target.value);
                      const w = Math.min(info.width, info.height * ratio),
                        h = w / ratio;
                      const cw = Math.max(
                          1,
                          Math.round((w * 100) / info.width),
                        ),
                        ch = Math.max(1, Math.round((h * 100) / info.height));
                      updateCrop(
                        clampCrop({
                          x: Math.round((100 - cw) / 2),
                          y: Math.round((100 - ch) / 2),
                          width: cw,
                          height: ch,
                        }),
                      );
                    }}
                  >
                    <option value="">Choose ratio</option>
                    <option value="1">1:1</option>
                    <option value={4 / 3}>4:3</option>
                    <option value={16 / 9}>16:9</option>
                    <option value={9 / 16}>9:16</option>
                  </select>
                </Field>
                <CropArea
                  file={files[0]}
                  crop={crop}
                  setCrop={updateCrop}
                  disabled={disabled}
                />
              </>
            )}
          </>
        )}
        <ExportPanel
          options={options}
          change={setOptions}
          original={compress}
        />
        <Actions>
          <Button type="button" disabled={!files.length} onClick={process}>
            {resize
              ? "Resize image"
              : compress
                ? "Compress images"
                : "Convert images"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setFiles([]);
              setInfo(undefined);
              setInputError("");
              setCrop(fullCrop);
              setCropEnabled(false);
              setLocked(true);
              setScale("100");
              setOptions({
                ...defaultImageOptions,
                format: compress ? "original" : "image/png",
              });
              job.clear();
            }}
          >
            Reset
          </Button>
        </Actions>
      </fieldset>
    </FileWorkspace>
  );
}
