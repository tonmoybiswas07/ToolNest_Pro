"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Actions,
  Field,
  Notice,
  selectClass,
  type StudioProps,
} from "../studios/shared";
import { Slider } from "../studios/design-controls";
import {
  acceptImages,
  ColorControl,
  CropArea,
  ExportPanel,
  imageJob,
  imageLimits,
  OriginalPreview,
} from "./image-controls";
import {
  defaultImageOptions,
  fullCrop,
  type ImageOptions,
  type Overlay,
} from "./image-engine";
import { inspectImage, type Artifact } from "./files";
import {
  FileDropzone,
  FilePreview,
  FileWorkspace,
  useFileJob,
} from "./workspace";
import { workerJob } from "./worker-job";

const presets = {
  "Instagram square post": [1080, 1080],
  "Instagram portrait post": [1080, 1350],
  "Instagram story": [1080, 1920],
  "Facebook feed image": [1200, 630],
  "Facebook cover": [1640, 624],
  "LinkedIn feed image": [1200, 627],
  "LinkedIn banner": [1584, 396],
  "YouTube thumbnail": [1280, 720],
} as const;
const overlayDefault: Overlay = {
  text: "",
  size: 48,
  color: "#ffffff",
  align: "center",
  markSize: 20,
};
const socialDefault: ImageOptions = {
  ...defaultImageOptions,
  width: 1080,
  height: 1080,
  fit: "cover",
  overlay: overlayDefault,
};
const editorDefault: ImageOptions = { ...defaultImageOptions, crop: fullCrop };

function Segmentation({ slug }: StudioProps) {
  const [file, setFile] = useState<File>();
  const [error, setError] = useState("");
  const [solid, setSolid] = useState(false);
  const [background, setBackground] = useState("#ffffff");
  const job = useFileJob(slug);
  return (
    <FileWorkspace
      job={job}
      notice="Remove backgrounds from photos of people. JPG, PNG or WebP up to 8 megapixels. Edge accuracy varies by photo."
    >
      <Notice>
        The first run downloads about 10 MB of model runtime assets. Only model
        assets are downloaded. The photo stays on your device.
      </Notice>
      <FileDropzone
        label="Choose a portrait"
        accept={acceptImages}
        fileMiB={20}
        disabled={job.busy}
        acceptFiles={async (files) => {
          job.clear();
          try {
            const info = await inspectImage(files[0]);
            if (info.width * info.height > 8000000)
              throw new Error("Choose a photo of 8 megapixels or less.");
            setFile(files[0]);
            setError("");
          } catch (cause) {
            setFile(undefined);
            setError(cause instanceof Error ? cause.message : "Invalid image.");
          }
        }}
      />
      {error && <Notice error>{error}</Notice>}
      <OriginalPreview file={file} />
      <fieldset disabled={job.busy} className="space-y-3">
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={solid}
            onChange={(event) => setSolid(event.target.checked)}
          />{" "}
          Use a solid replacement background
        </label>
        {solid && (
          <Field label="Replacement color">
            <Input
              type="color"
              value={background}
              onChange={(event) => setBackground(event.target.value)}
            />
          </Field>
        )}
        <Actions>
          <Button
            type="button"
            disabled={!file}
            onClick={() => {
              if (!file) return;
              void job.run(async ({ signal, progress }) => {
                const worker = new Worker(
                  new URL("./segmentation.worker.ts", import.meta.url),
                );
                const result = await workerJob<Artifact>(
                  worker,
                  { file, background: solid ? background : undefined },
                  signal,
                  120000,
                  progress,
                );
                return [{ ...result, source: file }];
              });
            }}
          >
            Remove background
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setFile(undefined);
              setError("");
              setSolid(false);
              setBackground("#ffffff");
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

type History = {
  current: ImageOptions;
  past: ImageOptions[];
  future: ImageOptions[];
};
const adjustmentSliders = [
  ["brightness", "Brightness", 200, 100],
  ["contrast", "Contrast", 200, 100],
  ["saturation", "Saturation", 250, 100],
  ["blur", "Blur", 24, 0],
] as const;

function ImageDesign({ slug }: StudioProps) {
  const social = slug === "social-media-image-studio";
  const initial = social ? socialDefault : editorDefault;
  const [file, setFile] = useState<File>();
  const [error, setError] = useState("");
  const [preset, setPreset] = useState<keyof typeof presets>(
    "Instagram square post",
  );
  const [guides, setGuides] = useState(true);
  const [history, setHistory] = useState<History>({
    current: initial,
    past: [],
    future: [],
  });
  const [preview, setPreview] = useState<{
    file: File;
    options: ImageOptions;
    blob?: Blob;
    error?: string;
  }>();
  const lastChange = useRef({ key: "", at: 0 });
  const fileVersion = useRef(0);
  const job = useFileJob(slug);
  const options = history.current;
  const overlay = options.overlay ?? overlayDefault;

  useEffect(() => {
    if (!file) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const output = await imageJob(file, options, controller.signal);
        if (!controller.signal.aborted)
          setPreview({ file, options, blob: output.blob });
      } catch (cause) {
        if (!controller.signal.aborted)
          setPreview({
            file,
            options,
            error: cause instanceof Error ? cause.message : "Preview failed.",
          });
      }
    }, 500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [file, options]);

  function change(values: Partial<ImageOptions>, key = "") {
    const now = Date.now();
    const combine =
      key &&
      lastChange.current.key === key &&
      now - lastChange.current.at < 600;
    lastChange.current = { key, at: now };
    setHistory((previous) => ({
      current: { ...previous.current, ...values },
      past: combine
        ? previous.past
        : [...previous.past, previous.current].slice(-40),
      future: [],
    }));
    job.clear();
  }

  function undo(redo = false) {
    lastChange.current = { key: "", at: 0 };
    setHistory((previous) => {
      const source = redo ? previous.future : previous.past;
      const current = source.at(-1);
      if (!current) return previous;
      return redo
        ? {
            current,
            past: [...previous.past, previous.current],
            future: source.slice(0, -1),
          }
        : {
            current,
            past: source.slice(0, -1),
            future: [...previous.future, previous.current],
          };
    });
    job.clear();
  }

  async function select(next: File) {
    const version = ++fileVersion.current;
    setFile(undefined);
    setPreview(undefined);
    job.clear();
    try {
      await inspectImage(next);
      if (version === fileVersion.current) {
        setFile(next);
        setError("");
      }
    } catch (cause) {
      if (version === fileVersion.current) {
        setFile(undefined);
        setError(cause instanceof Error ? cause.message : "Invalid image.");
      }
    }
  }

  const freshPreview =
    preview?.file === file && preview?.options === options
      ? preview
      : undefined;

  return (
    <FileWorkspace job={job} notice={imageLimits}>
      <FileDropzone
        label="Choose an image"
        accept={acceptImages}
        fileMiB={20}
        disabled={job.busy}
        acceptFiles={(files) => void select(files[0])}
      />
      {error && <Notice error>{error}</Notice>}
      <fieldset disabled={job.busy} className="space-y-4">
        {social ? (
          <>
            <Field label="Platform and content preset">
              <select
                className={selectClass}
                value={preset}
                onChange={(event) => {
                  const next = event.target.value as keyof typeof presets;
                  setPreset(next);
                  const [width, height] = presets[next];
                  change({ width, height });
                }}
              >
                {Object.keys(presets).map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </Field>
            <Notice>
              Preset sizes are editable starting points. Safe-area guides are
              preview only.
            </Notice>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Canvas width">
                <Input
                  type="number"
                  min={1}
                  max={8192}
                  value={options.width ?? ""}
                  onChange={(event) =>
                    change({ width: Number(event.target.value) }, "width")
                  }
                />
              </Field>
              <Field label="Canvas height">
                <Input
                  type="number"
                  min={1}
                  max={8192}
                  value={options.height ?? ""}
                  onChange={(event) =>
                    change({ height: Number(event.target.value) }, "height")
                  }
                />
              </Field>
            </div>
            <Field label="Image fit">
              <select
                className={selectClass}
                value={options.fit}
                onChange={(event) =>
                  change({ fit: event.target.value as "contain" | "cover" })
                }
              >
                <option value="cover">Fill and crop</option>
                <option value="contain">Fit entire image</option>
              </select>
            </Field>
            <Slider
              label="Horizontal position"
              value={options.positionX ?? 50}
              unit="%"
              change={(positionX) => change({ positionX }, "x")}
            />
            <Slider
              label="Vertical position"
              value={options.positionY ?? 50}
              unit="%"
              change={(positionY) => change({ positionY }, "y")}
            />
            <Slider
              label="Padding"
              value={options.padding ?? 0}
              max={30}
              unit="%"
              change={(padding) => change({ padding }, "padding")}
            />
            <ColorControl
              value={options.background}
              change={(background) => {
                if (/^#[\da-f]{6}$/i.test(background))
                  change({ background }, "background");
              }}
            />
            <Field label="Text watermark">
              <Input
                maxLength={160}
                value={overlay.text}
                onChange={(event) =>
                  change(
                    { overlay: { ...overlay, text: event.target.value } },
                    "text",
                  )
                }
              />
            </Field>
            <Slider
              label="Watermark font size"
              value={overlay.size}
              min={10}
              max={200}
              unit=" px"
              change={(size) =>
                change({ overlay: { ...overlay, size } }, "font")
              }
            />
            <Field label="Text alignment">
              <select
                className={selectClass}
                value={overlay.align}
                onChange={(event) =>
                  change({
                    overlay: {
                      ...overlay,
                      align: event.target.value as Overlay["align"],
                    },
                  })
                }
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </Field>
            <Field label="Text color">
              <Input
                type="color"
                value={overlay.color}
                onChange={(event) =>
                  change(
                    { overlay: { ...overlay, color: event.target.value } },
                    "color",
                  )
                }
              />
            </Field>
            <FileDropzone
              label="Add an image watermark"
              accept={acceptImages}
              fileMiB={5}
              disabled={job.busy}
              acceptFiles={(files) =>
                change({ overlay: { ...overlay, mark: files[0] } })
              }
            />
            {overlay.mark && (
              <>
                <Slider
                  label="Image watermark width"
                  value={overlay.markSize}
                  min={5}
                  max={50}
                  unit="%"
                  change={(markSize) =>
                    change({ overlay: { ...overlay, markSize } }, "mark")
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    change({ overlay: { ...overlay, mark: undefined } })
                  }
                >
                  Remove image watermark
                </Button>
              </>
            )}
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={guides}
                onChange={(event) => setGuides(event.target.checked)}
              />{" "}
              Show safe-area guide
            </label>
          </>
        ) : (
          <>
            {file && (
              <CropArea
                file={file}
                crop={options.crop ?? fullCrop}
                setCrop={(crop) => change({ crop }, "crop")}
                disabled={job.busy}
              />
            )}
            <Actions>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  change({ rotate: ((options.rotate ?? 0) + 90) % 360 })
                }
              >
                Rotate 90°
              </Button>
              <Button
                type="button"
                variant="outline"
                aria-pressed={Boolean(options.flipX)}
                onClick={() => change({ flipX: !options.flipX })}
              >
                Flip horizontal
              </Button>
              <Button
                type="button"
                variant="outline"
                aria-pressed={Boolean(options.flipY)}
                onClick={() => change({ flipY: !options.flipY })}
              >
                Flip vertical
              </Button>
            </Actions>
            {adjustmentSliders.map(([key, label, max, fallback]) => (
              <Slider
                key={key}
                label={label}
                max={max}
                value={options[key] ?? fallback}
                unit={key === "blur" ? " px" : "%"}
                change={(value) => change({ [key]: value }, key)}
              />
            ))}
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(options.grayscale)}
                onChange={(event) =>
                  change({ grayscale: event.target.checked })
                }
              />{" "}
              Grayscale
            </label>
            <Actions>
              <Button
                type="button"
                variant="outline"
                disabled={!history.past.length}
                onClick={() => undo()}
              >
                Undo
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!history.future.length}
                onClick={() => undo(true)}
              >
                Redo
              </Button>
            </Actions>
          </>
        )}
        <ExportPanel
          options={options}
          change={(next) => change(next, "export")}
        />
        {file && !freshPreview && <Notice>Updating preview…</Notice>}
        {freshPreview?.error && <Notice error>{freshPreview.error}</Notice>}
        {freshPreview?.blob && (
          <FilePreview blob={freshPreview.blob} label="Live export preview">
            {social && guides && (
              <div
                aria-label="Safe-area guide"
                className="pointer-events-none absolute inset-[10%] rounded border-2 border-dashed border-white drop-shadow-md"
              />
            )}
          </FilePreview>
        )}
        <Actions>
          <Button
            type="button"
            disabled={!file}
            onClick={() => {
              if (!file) return;
              void job.run(async ({ signal, progress }) => {
                progress("Rendering the image…");
                const result = await imageJob(file, options, signal);
                return [{ ...result, source: file }];
              });
            }}
          >
            Process image
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              fileVersion.current++;
              setFile(undefined);
              setError("");
              setPreview(undefined);
              setPreset("Instagram square post");
              setGuides(true);
              setHistory({ current: initial, past: [], future: [] });
              lastChange.current = { key: "", at: 0 };
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

export default function AdvancedImages(props: StudioProps) {
  return props.slug === "background-remover" ? (
    <Segmentation {...props} />
  ) : (
    <ImageDesign {...props} />
  );
}
