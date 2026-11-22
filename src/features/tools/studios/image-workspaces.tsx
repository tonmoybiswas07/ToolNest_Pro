"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fileSize, imageFormats, inspectImage, MiB, type ImageInfo } from "../file-processing/files";
import { Picker } from "./design-controls";
import { contrast, convertColor, hexFromRgb, rgbFromHex } from "./design-engines";
import { Actions, CodeBlock, downloadFile, ExportActions, Field, Notice, Panel, selectClass, useLiveMetric, useOperation, Workspace, type StudioProps } from "./shared";

type Selection = { file: File; info: ImageInfo };
const faviconSizes = [16, 32, 48, 180, 192, 512];
const numberValue = (value: string) => /^\d+$/.test(value) ? Number(value) : -1;

function ImageSelection({ choose, disabled }: { choose: (file: File) => void; disabled: boolean }) {
  return (
    <Field label="JPG, PNG, or WebP (up to 20 MB)">
      <Input type="file" accept={imageFormats.join(",")} disabled={disabled} onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) choose(file);
      }} />
    </Field>
  );
}

async function loadSelection(file: File): Promise<Selection> {
  if (file.size > 20 * MiB) throw new Error("Choose an image under 20 MB.");
  return { file, info: await inspectImage(file) };
}

function canvasContext(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable in this browser.");
  return context;
}

function ColorPickerWorkspace({ selection, slug }: { selection: Selection; slug: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap>();
  const [loadError, setLoadError] = useState("");
  const [x, setX] = useState("0");
  const [y, setY] = useState("0");
  const { run, error, output } = useOperation<{ color: string; coordinates: string; values: string }>(slug);

  useEffect(() => {
    let active = true;
    let loaded: ImageBitmap | undefined;
    void createImageBitmap(selection.file).then((image) => {
      if (!active) {
        image.close();
        return;
      }
      loaded = image;
      const preview = canvas.current;
      if (!preview) return;
      const scale = Math.min(1, 1000 / image.width, 1000 / image.height);
      preview.width = Math.max(1, Math.round(image.width * scale));
      preview.height = Math.max(1, Math.round(image.height * scale));
      canvasContext(preview).drawImage(image, 0, 0, preview.width, preview.height);
      setBitmap(image);
    }).catch(() => {
      if (active) setLoadError("This image could not be decoded.");
    });
    return () => {
      active = false;
      loaded?.close();
    };
  }, [selection]);

  function sample(pixelX: number, pixelY: number) {
    if (!bitmap) return;
    void run(() => {
      if (pixelX < 0 || pixelX >= bitmap.width || pixelY < 0 || pixelY >= bitmap.height) {
        throw new Error("Enter pixel coordinates within the image.");
      }
      const pixel = document.createElement("canvas");
      pixel.width = 1;
      pixel.height = 1;
      const context = canvasContext(pixel);
      context.drawImage(bitmap, pixelX, pixelY, 1, 1, 0, 0, 1, 1);
      const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
      const opacity = alpha === 255 ? "" : alpha.toString(16).padStart(2, "0");
      const result = convertColor(hexFromRgb([red, green, blue]) + opacity);
      return {
        color: result.hex,
        coordinates: `Pixel (${pixelX}, ${pixelY})`,
        values: [result.hex, result.rgb, result.hsl].join("\n"),
      };
    });
  }

  function sampleAtPointer(event: PointerEvent<HTMLCanvasElement>) {
    if (!bitmap) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const pixelX = Math.min(bitmap.width - 1, Math.max(0, Math.floor((event.clientX - bounds.left) / bounds.width * bitmap.width)));
    const pixelY = Math.min(bitmap.height - 1, Math.max(0, Math.floor((event.clientY - bounds.top) / bounds.height * bitmap.height)));
    setX(String(pixelX));
    setY(String(pixelY));
    sample(pixelX, pixelY);
  }

  return (
    <Panel title="Sample a pixel">
      <canvas ref={canvas} hidden={!bitmap} className="max-h-[560px] max-w-full cursor-crosshair object-contain" style={{ width: "auto", height: "auto" }}
        aria-label="Image preview. Select a point, or enter pixel coordinates below." onPointerDown={sampleAtPointer} />
      {loadError ? <Notice error>{loadError}</Notice> : !bitmap ? <Notice>Decoding image…</Notice> : <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => { event.preventDefault(); sample(numberValue(x), numberValue(y)); }}
      >
        <Field label="X coordinate">
          <Input className="max-w-30" type="number" min="0" max={bitmap.width - 1} value={x} required onChange={(event) => setX(event.target.value)} />
        </Field>
        <Field label="Y coordinate">
          <Input className="max-w-30" type="number" min="0" max={bitmap.height - 1} value={y} required onChange={(event) => setY(event.target.value)} />
        </Field>
        <Button type="submit">Sample</Button>
      </form>}
      {error && <Notice error>{error}</Notice>}
      {output && (
        <>
          <p className="flex items-center gap-2 text-sm"><span className="size-7 rounded border border-border" style={{ background: output.color }} />{output.coordinates}</p>
          <CodeBlock>{output.values}</CodeBlock>
          <ExportActions value={output.values} label="Copy color values" />
        </>
      )}
    </Panel>
  );
}

type Favicon = { size: number; blob: Blob };

async function createFavicon(image: ImageBitmap, size: number, fit: string): Promise<Favicon> {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const scale = (fit === "crop" ? Math.max : Math.min)(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const context = canvasContext(canvas);
  context.imageSmoothingQuality = "high";
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("This browser could not create the PNG."));
    }, "image/png");
  });
  return { size, blob };
}

function createIco(icons: Favicon[]) {
  const directory = new DataView(new ArrayBuffer(6 + 16 * icons.length));
  directory.setUint16(2, 1, true);
  directory.setUint16(4, icons.length, true);
  let dataOffset = directory.byteLength;
  icons.forEach(({ size, blob }, index) => {
    const entry = 6 + 16 * index;
    directory.setUint8(entry, size);
    directory.setUint8(entry + 1, size);
    directory.setUint16(entry + 4, 1, true);
    directory.setUint16(entry + 6, 32, true);
    directory.setUint32(entry + 8, blob.size, true);
    directory.setUint32(entry + 12, dataOffset, true);
    dataOffset += blob.size;
  });
  return new Blob([directory.buffer, ...icons.map(({ blob }) => blob)], { type: "image/x-icon" });
}

function FaviconWorkspace({ selection, slug }: { selection: Selection; slug: string }) {
  const [fit, setFit] = useState("contain");
  const { output, run, busy, error, clear } = useOperation<{ icons: Favicon[]; ico: Blob }>(slug);
  return (
    <Panel title="Generate favicon files">
      <Field label="Image placement">
        <select className={selectClass} value={fit} disabled={busy} onChange={(event) => { setFit(event.target.value); clear(); }}>
          <option value="contain">Fit with transparent padding</option>
          <option value="crop">Fill and crop edges</option>
        </select>
      </Field>
      <Button type="button" disabled={busy} onClick={() => void run(async () => {
        const bitmap = await createImageBitmap(selection.file);
        try {
          const icons = await Promise.all(faviconSizes.map((size) => createFavicon(bitmap, size, fit)));
          return { icons, ico: createIco(icons.filter(({ size }) => size <= 48)) };
        } finally {
          bitmap.close();
        }
      })}>{busy ? "Generating…" : "Generate favicons"}</Button>
      {error && <Notice error>{error}</Notice>}
      {output && (
        <Actions>
          <Button variant="outline" onClick={() => downloadFile("favicon.ico", output.ico)}>Download ICO (16, 32, 48 px)</Button>
          {output.icons.map(({ size, blob }) => (
            <Button key={size} variant="outline" onClick={() => downloadFile(`favicon-${size}.png`, blob)}>{size} × {size} PNG</Button>
          ))}
        </Actions>
      )}
    </Panel>
  );
}

function FileWorkspace({ slug }: StudioProps) {
  const { run, busy, output, error } = useOperation<Selection>(slug);
  const select = (file: File) => void run(() => loadSelection(file));
  const details = output && [
    output.file.name,
    output.info.type,
    `${output.info.width} × ${output.info.height} pixels`,
    `Aspect ratio: ${(output.info.width / output.info.height).toFixed(4)}:1`,
    `File size: ${fileSize(output.file.size)}`,
  ].join("\n");
  return (
    <div className="mt-8 grid gap-4">
      <Panel title="Source image">
        <ImageSelection choose={select} disabled={busy} />
        {busy && <Notice>Reading image…</Notice>}
        {error && <Notice error>{error}</Notice>}
      </Panel>
      {output && slug === "image-color-picker" && <ColorPickerWorkspace selection={output} slug={slug} />}
      {output && slug === "favicon-generator" && <FaviconWorkspace selection={output} slug={slug} />}
      {details && slug === "image-inspector" && (
        <Panel title="File details"><CodeBlock>{details}</CodeBlock><ExportActions value={details} /></Panel>
      )}
    </div>
  );
}

function ContrastChecker({ slug }: StudioProps) {
  const [text, setText] = useState("#172334");
  const [background, setBackground] = useState("#ffffff");
  const [changed, setChanged] = useState(false);
  let ratio: number | undefined;
  try {
    ratio = contrast(rgbFromHex(text.trim()), rgbFromHex(background.trim()));
  } catch {
    ratio = undefined;
  }
  const report = ratio === undefined ? "" : [
    `Contrast ratio: ${ratio.toFixed(2)}:1`,
    `AA normal text: ${ratio >= 4.5 ? "Pass" : "Fail"}`,
    `AA large text: ${ratio >= 3 ? "Pass" : "Fail"}`,
    `AAA normal text: ${ratio >= 7 ? "Pass" : "Fail"}`,
    `AAA large text: ${ratio >= 4.5 ? "Pass" : "Fail"}`,
  ].join("\n");
  useLiveMetric(slug, report, changed);
  return (
    <Workspace input={
      <>
        <Picker label="Text color" value={text} change={(value) => { setChanged(true); setText(value); }} />
        <Picker label="Background color" value={background} change={(value) => { setChanged(true); setBackground(value); }} />
      </>
    } output={ratio === undefined ? <Notice error>Enter two valid 3- or 6-digit HEX colors.</Notice> : (
      <>
        <p className="rounded-lg border border-border p-4 text-xl font-semibold" style={{
          color: hexFromRgb(rgbFromHex(text.trim())), background: hexFromRgb(rgbFromHex(background.trim())),
        }}>Sample text</p>
        <CodeBlock>{report}</CodeBlock>
        <ExportActions value={report} />
      </>
    )} />
  );
}

export default function ImageWorkspaces({ slug }: StudioProps) {
  return slug === "contrast-checker" ? <ContrastChecker slug={slug} /> : <FileWorkspace key={slug} slug={slug} />;
}
