"use client";

import { useEffect, useState } from "react";
import QRCode, { type QRCodeErrorCorrectionLevel } from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contrast, hexFromRgb, rgbFromHex } from "./design-engines";
import { Picker, Slider } from "./design-controls";
import { qrFields, qrPayload, qrSvg, type QRKind } from "./qr-data";
import {
  Actions,
  copyText,
  downloadFile,
  Field,
  Notice,
  selectClass,
  TextArea,
  trackOperation,
  Workspace,
  type StudioProps,
} from "./shared";

type Output = {
  path: string;
  dimension: number;
  pixels: number;
  dark: string;
  light: string;
  payload: string;
  contrastRatio: number;
};
type Result = { key: string; output?: Output; error?: string };

function generate(
  kind: QRKind,
  fields: typeof qrFields,
  foreground: string,
  background: string,
  size: number,
  level: QRCodeErrorCorrectionLevel,
): Output {
  const payload = qrPayload(kind, fields);
  if (new TextEncoder().encode(payload).length > 1800)
    throw new Error("The encoded content exceeds 1,800 bytes.");
  const darkRgb = rgbFromHex(foreground);
  const lightRgb = rgbFromHex(background);
  const { modules } = QRCode.create(payload, { errorCorrectionLevel: level });
  const dimension = modules.size + 8;
  const runs: string[] = [];
  for (let y = 0; y < modules.size; y++) {
    for (let x = 0; x < modules.size; x++) {
      if (!modules.get(y, x)) continue;
      const first = x;
      while (x + 1 < modules.size && modules.get(y, x + 1)) x++;
      const count = x - first + 1;
      runs.push(`M${first + 4} ${y + 4}h${count}v1h-${count}z`);
    }
  }
  return {
    path: runs.join(""),
    dimension,
    pixels: size,
    dark: hexFromRgb(darkRgb),
    light: hexFromRgb(lightRgb),
    payload,
    contrastRatio: contrast(darkRgb, lightRgb),
  };
}

export default function QRStudio({ slug }: StudioProps) {
  const [kind, setKind] = useState<QRKind>("url");
  const [fields, setFields] = useState(qrFields);
  const [foreground, setForeground] = useState("#0b1024");
  const [background, setBackground] = useState("#ffffff");
  const [size, setSize] = useState(320);
  const [level, setLevel] = useState<QRCodeErrorCorrectionLevel>("M");
  const [result, setResult] = useState<Result>();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const key = JSON.stringify([
    kind,
    fields,
    foreground,
    background,
    size,
    level,
  ]);
  const started =
    kind === "wifi"
      ? Boolean(fields.ssid || fields.password)
      : kind === "contact"
        ? Boolean(fields.name || fields.phone || fields.email || fields.company)
        : Boolean(fields.content.trim());

  useEffect(() => {
    if (!started) return;
    const timer = window.setTimeout(() => {
      try {
        setResult({
          key,
          output: generate(kind, fields, foreground, background, size, level),
        });
        trackOperation(slug, true);
      } catch (error) {
        setResult({
          key,
          error:
            error instanceof Error
              ? error.message
              : "The QR code could not be generated.",
        });
        trackOperation(slug, false);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [background, fields, foreground, key, kind, level, size, slug, started]);

  const current = result?.key === key ? result : undefined;
  const output = current?.output;

  function update<K extends keyof typeof qrFields>(
    field: K,
    value: (typeof qrFields)[K],
  ) {
    setFields((previous) => ({ ...previous, [field]: value }));
    setExportError("");
  }

  async function exportPng(data: Output) {
    setExporting(true);
    setExportError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = data.pixels;
      canvas.height = data.pixels;
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      const image = new Image();
      const url = URL.createObjectURL(
        new Blob(
          [
            qrSvg(
              data.path,
              data.dimension,
              data.pixels,
              data.dark,
              data.light,
            ),
          ],
          { type: "image/svg+xml" },
        ),
      );
      try {
        image.src = url;
        await image.decode();
        context.imageSmoothingEnabled = false;
        context.drawImage(image, 0, 0);
      } finally {
        URL.revokeObjectURL(url);
      }
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error();
      downloadFile("toolnest-qr.png", blob);
    } catch {
      setExportError("PNG export failed. Try exporting SVG.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Workspace
      input={
        <>
          <Field label="QR content type">
            <select
              className={selectClass}
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as QRKind);
                setFields(qrFields);
                setExportError("");
              }}
            >
              <option value="url">URL</option>
              <option value="text">Plain text</option>
              <option value="wifi">Wi-Fi network</option>
              <option value="contact">Contact (vCard)</option>
            </select>
          </Field>
          {kind === "url" && (
            <Field label="URL">
              <Input
                type="url"
                value={fields.content}
                maxLength={1800}
                onChange={(event) => update("content", event.target.value)}
              />
            </Field>
          )}
          {kind === "text" && (
            <Field label="Plain text">
              <TextArea
                value={fields.content}
                maxLength={1800}
                onChange={(event) => update("content", event.target.value)}
              />
            </Field>
          )}
          {kind === "wifi" && (
            <>
              <Field label="Network name">
                <Input
                  value={fields.ssid}
                  maxLength={32}
                  onChange={(event) => update("ssid", event.target.value)}
                />
              </Field>
              <Field label="Security">
                <select
                  className={selectClass}
                  value={fields.security}
                  onChange={(event) => update("security", event.target.value)}
                >
                  <option value="WPA">WPA / WPA2</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">Open network</option>
                </select>
              </Field>
              {fields.security !== "nopass" && (
                <Field label="Wi-Fi password">
                  <Input
                    type="password"
                    autoComplete="off"
                    value={fields.password}
                    maxLength={64}
                    onChange={(event) => update("password", event.target.value)}
                  />
                </Field>
              )}
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={fields.hidden}
                  onChange={(event) => update("hidden", event.target.checked)}
                />{" "}
                Hidden network
              </label>
            </>
          )}
          {kind === "contact" &&
            (
              [
                ["name", "Full name"],
                ["phone", "Phone"],
                ["email", "Email"],
                ["company", "Organization"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <Input
                  value={fields[key]}
                  maxLength={100}
                  onChange={(event) => update(key, event.target.value)}
                />
              </Field>
            ))}
          <div className="grid gap-3 sm:grid-cols-2">
            <Picker
              label="Foreground"
              value={foreground}
              change={setForeground}
            />
            <Picker
              label="Background"
              value={background}
              change={setBackground}
            />
          </div>
          <Slider
            label="Export size"
            min={160}
            max={1024}
            unit=" px"
            value={size}
            change={setSize}
          />
          <Field label="Error correction">
            <select
              className={selectClass}
              value={level}
              onChange={(event) =>
                setLevel(event.target.value as QRCodeErrorCorrectionLevel)
              }
            >
              <option value="L">Low (L)</option>
              <option value="M">Medium (M)</option>
              <option value="Q">Quartile (Q)</option>
              <option value="H">High (H)</option>
            </select>
          </Field>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setKind("url");
              setFields(qrFields);
              setForeground("#0b1024");
              setBackground("#ffffff");
              setSize(320);
              setLevel("M");
              setResult(undefined);
              setExportError("");
            }}
          >
            Reset
          </Button>
        </>
      }
      output={
        <>
          {!started && <Notice>Enter content to generate a QR code.</Notice>}
          {started && !current && <Notice>Generating QR…</Notice>}
          {current?.error && <Notice error>{current.error}</Notice>}
          {exportError && <Notice error>{exportError}</Notice>}
          {output && (
            <>
              <div className="grid place-items-center rounded-xl border border-border bg-background p-4">
                <svg
                  role="img"
                  aria-label="Generated QR code"
                  className="aspect-square w-full max-w-72"
                  viewBox={`0 0 ${output.dimension} ${output.dimension}`}
                  shapeRendering="crispEdges"
                >
                  <rect
                    width={output.dimension}
                    height={output.dimension}
                    fill={output.light}
                  />
                  <path d={output.path} fill={output.dark} />
                </svg>
              </div>
              {output.contrastRatio < 4.5 && (
                <Notice>
                  Low color contrast may make this code difficult to scan.
                  Choose a dark foreground and light background.
                </Notice>
              )}
              <Actions>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyText(output.payload)}
                >
                  Copy encoded text
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={exporting}
                  onClick={() => void exportPng(output)}
                >
                  {exporting ? "Exporting…" : "Download PNG"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    downloadFile(
                      "toolnest-qr.svg",
                      qrSvg(
                        output.path,
                        output.dimension,
                        output.pixels,
                        output.dark,
                        output.light,
                      ),
                      "image/svg+xml",
                    )
                  }
                >
                  Download SVG
                </Button>
              </Actions>
            </>
          )}
        </>
      }
    />
  );
}
