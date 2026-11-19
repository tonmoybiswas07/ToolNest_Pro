"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { glassStyles } from "./design-engines";
import { Picker, Slider } from "./design-controls";
import {
  CodeBlock,
  ExportActions,
  Field,
  Notice,
  selectClass,
  useLiveMetric,
  Workspace,
  type StudioProps,
} from "./shared";

const backgrounds = {
  Violet: "linear-gradient(140deg, #402899, #9579fb 42%, #296bd1 70%, #1a315a)",
  Sunset: "linear-gradient(145deg, #632060, #f68161 45%, #ffca7a 57%, #6a37af)",
  Ocean: "linear-gradient(130deg, #132d5c, #25c6c3 45%, #1c4e96 60%, #99f5d7)",
};
const initial = {
  color: "#ffffff",
  opacity: 22,
  blur: 18,
  border: 40,
  radius: 22,
  shadow: 25,
};
const sliders = [
  ["opacity", "Background opacity", 100, "%"],
  ["blur", "Blur", 48, "px"],
  ["border", "Border opacity", 100, "%"],
  ["radius", "Border radius", 64, "px"],
  ["shadow", "Shadow opacity", 100, "%"],
] as const;

export default function Glassmorphism({ slug }: StudioProps) {
  const [values, setValues] = useState(initial);
  const [background, setBackground] =
    useState<keyof typeof backgrounds>("Violet");
  const [changed, setChanged] = useState(false);
  let preview: ReturnType<typeof glassStyles> | undefined;
  try {
    preview = glassStyles(
      values.color,
      values.opacity,
      values.blur,
      values.border,
      values.radius,
      values.shadow,
    );
  } catch {}
  const css = preview
    ? `.glass {\n  background: ${preview.background};\n  -webkit-backdrop-filter: ${preview.WebkitBackdropFilter};\n  backdrop-filter: ${preview.backdropFilter};\n  border: ${preview.border};\n  border-radius: ${preview.borderRadius};\n  box-shadow: ${preview.boxShadow};\n}\n`
    : "";
  useLiveMetric(slug, css, changed);

  return (
    <Workspace
      input={
        <>
          <Picker
            label="Panel color"
            value={values.color}
            change={(color) => {
              setValues({ ...values, color });
              setChanged(true);
            }}
          />
          <Field label="Preview background">
            <select
              className={selectClass}
              value={background}
              onChange={(event) =>
                setBackground(event.target.value as keyof typeof backgrounds)
              }
            >
              {Object.keys(backgrounds).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </Field>
          {sliders.map(([key, label, max, unit]) => (
            <Slider
              key={key}
              label={label}
              value={values[key]}
              max={max}
              unit={unit}
              change={(value) => {
                setValues({ ...values, [key]: value });
                setChanged(true);
              }}
            />
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setValues(initial);
              setBackground("Violet");
              setChanged(false);
            }}
          >
            Reset
          </Button>
        </>
      }
      output={
        preview ? (
          <>
            <div
              className="relative isolate grid min-h-64 place-items-center overflow-hidden rounded-xl border border-border p-6"
              style={{ background: backgrounds[background] }}
            >
              <span
                aria-hidden
                className="absolute top-8 left-1/6 size-24 rounded-full bg-white/65"
              />
              <span
                aria-hidden
                className="absolute right-1/7 bottom-6 size-24 rounded-full bg-slate-950/60"
              />
              <div
                role="img"
                aria-label="Glass panel preview"
                className="h-36 w-full max-w-64"
                style={preview}
              />
            </div>
            <CodeBlock>{css}</CodeBlock>
            <ExportActions
              value={css}
              filename="glass-panel.css"
              type="text/css"
              label="Copy CSS"
            />
          </>
        ) : (
          <Notice error>Enter a valid HEX panel color.</Notice>
        )
      }
    />
  );
}
