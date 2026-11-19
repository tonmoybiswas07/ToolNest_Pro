"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  gradientCss,
  rgbFromHex,
  hexFromRgb,
  type ColorStop,
} from "./design-engines";
import { Picker, Slider } from "./design-controls";
import {
  Actions,
  CodeBlock,
  ExportActions,
  Field,
  Notice,
  readStorage,
  saveStorage,
  selectClass,
  useLiveMetric,
  Workspace,
  type StudioProps,
} from "./shared";

type Gradient = {
  kind: "linear" | "radial";
  angle: number;
  stops: ColorStop[];
};
type Preset = Gradient & { name: string };
const initial: Gradient = {
  kind: "linear",
  angle: 120,
  stops: [
    { color: "#8059f5", position: 0 },
    { color: "#3668e8", position: 100 },
  ],
};
const storageKey = "toolnest-gradient-presets-v1";

function isPresets(value: unknown): value is Preset[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item.name === "string" &&
        ["linear", "radial"].includes(item.kind) &&
        Number.isInteger(item.angle) &&
        item.angle >= 0 &&
        item.angle <= 360 &&
        Array.isArray(item.stops) &&
        item.stops.length >= 2 &&
        item.stops.length <= 10 &&
        item.stops.every(
          (stop: ColorStop) =>
            /^#[0-9a-f]{6}$/i.test(stop?.color) &&
            Number.isInteger(stop.position) &&
            stop.position >= 0 &&
            stop.position <= 100,
        ),
    )
  );
}

export default function GradientStudio({ slug }: StudioProps) {
  const [gradient, setGradient] = useState(initial);
  const [presets, setPresets] = useState(() =>
    readStorage(storageKey, isPresets, []),
  );
  const [name, setName] = useState("");
  const [changed, setChanged] = useState(false);
  let css = "";
  try {
    css = gradientCss(
      gradient.kind,
      gradient.angle,
      gradient.stops.map((stop) => ({
        ...stop,
        color: hexFromRgb(rgbFromHex(stop.color)),
      })),
    );
  } catch {}
  useLiveMetric(slug, css, changed);

  function update(next: Partial<Gradient>) {
    setGradient({ ...gradient, ...next });
    setChanged(true);
  }
  function changeStop(index: number, values: Partial<ColorStop>) {
    update({
      stops: gradient.stops.map((stop, current) =>
        current === index ? { ...stop, ...values } : stop,
      ),
    });
  }

  function save() {
    const title = name.trim();
    if (!title || !css) return;
    const next = [
      ...presets.filter((preset) => preset.name !== title),
      {
        ...gradient,
        name: title,
        stops: gradient.stops.map((stop) => ({
          ...stop,
          color: hexFromRgb(rgbFromHex(stop.color)),
        })),
      },
    ].slice(-20);
    if (saveStorage(storageKey, next)) {
      setPresets(next);
      setName("");
      toast.success("Preset saved on this device.");
    }
  }

  return (
    <Workspace
      input={
        <>
          <Field label="Gradient type">
            <select
              className={selectClass}
              value={gradient.kind}
              onChange={(event) =>
                update({ kind: event.target.value as Gradient["kind"] })
              }
            >
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
            </select>
          </Field>
          {gradient.kind === "linear" && (
            <Slider
              label="Angle"
              value={gradient.angle}
              max={360}
              unit="°"
              change={(angle) => update({ angle })}
            />
          )}
          {gradient.stops.map((stop, index) => (
            <div
              key={index}
              className="space-y-3 rounded-xl border border-border p-3"
            >
              <Picker
                label={`Stop ${index + 1}`}
                value={stop.color}
                change={(color) => changeStop(index, { color })}
              />
              <Slider
                label="Position"
                value={stop.position}
                unit="%"
                change={(position) => changeStop(index, { position })}
              />
              <Button
                type="button"
                variant="ghost"
                disabled={gradient.stops.length <= 2}
                onClick={() =>
                  update({
                    stops: gradient.stops.filter((_, i) => i !== index),
                  })
                }
              >
                Remove stop {index + 1}
              </Button>
            </div>
          ))}
          <Actions>
            <Button
              type="button"
              variant="outline"
              disabled={gradient.stops.length >= 10}
              onClick={() =>
                update({
                  stops: [
                    ...gradient.stops,
                    { color: "#23a5b9", position: 50 },
                  ],
                })
              }
            >
              Add color stop
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setGradient(initial);
                setChanged(false);
                setName("");
              }}
            >
              Reset
            </Button>
          </Actions>
          <Field label="Preset name">
            <Input
              maxLength={50}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Button type="button" disabled={!name.trim() || !css} onClick={save}>
            Save preset
          </Button>
          {presets.length > 0 && (
            <Field label="Load a preset">
              <select
                className={selectClass}
                value=""
                onChange={(event) => {
                  const preset = presets.find(
                    (item) => item.name === event.target.value,
                  );
                  if (preset) update(preset);
                }}
              >
                <option value="">Choose a saved preset</option>
                {presets.map((preset) => (
                  <option key={preset.name}>{preset.name}</option>
                ))}
              </select>
            </Field>
          )}
        </>
      }
      output={
        css ? (
          <>
            <div
              className="h-48 rounded-xl border border-border"
              role="img"
              aria-label="Gradient preview"
              style={{ background: css }}
            />
            <CodeBlock>{`background: ${css};`}</CodeBlock>
            <ExportActions
              value={`.gradient {\n  background: ${css};\n}\n`}
              filename="gradient.css"
              type="text/css"
              label="Copy CSS"
            />
          </>
        ) : (
          <Notice error>Enter valid HEX colors for every stop.</Notice>
        )
      }
    />
  );
}
