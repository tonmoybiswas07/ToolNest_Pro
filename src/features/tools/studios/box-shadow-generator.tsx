"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  CodeBlock,
  ExportActions,
  Field,
  Panel,
} from "./shared";

function buildShadow(shadows: ShadowConfig[]) {
  return shadows
    .map(
      (s) =>
        `${s.inset ? "inset " : ""}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`,
    )
    .filter(Boolean)
    .join(", ") || "none";
}

function buildTailwind(shadows: ShadowConfig[]) {
  if (!shadows.length) return "";
  const val = buildShadow(shadows);
  return `box-shadow: ${val};`;
}

interface ShadowConfig {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
}

const defaultShadow = (): ShadowConfig => ({
  x: 4,
  y: 4,
  blur: 10,
  spread: 0,
  color: "rgba(0,0,0,0.25)",
  inset: false,
});

export default function BoxShadowGenerator() {
  const [shadows, setShadows] = useState<ShadowConfig[]>([defaultShadow()]);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [boxColor, setBoxColor] = useState("#f0f4ff");

  const css = buildShadow(shadows);
  const cssOutput = `box-shadow: ${css};`;
  const tailwindNote = `.element {\n  ${buildTailwind(shadows)}\n}`;

  function update(index: number, patch: Partial<ShadowConfig>) {
    setShadows((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  return (
    <div className="mt-8 grid gap-4">
      <Panel title="Shadow layers">
        <div className="space-y-4">
          {shadows.map((s, i) => (
            <div
              key={i}
              className="rounded-lg border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Layer {i + 1}</span>
                {shadows.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    onClick={() =>
                      setShadows((prev) => prev.filter((_, j) => j !== i))
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["x", "y", "blur", "spread"] as const).map((prop) => (
                  <Field key={prop} label={prop.charAt(0).toUpperCase() + prop.slice(1) + " (px)"}>
                    <Input
                      type="number"
                      value={s[prop]}
                      onChange={(e) =>
                        update(i, { [prop]: Number(e.target.value) })
                      }
                    />
                  </Field>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Field label="Color">
                  <input
                    type="color"
                    value={s.color.startsWith("rgba") ? "#000000" : s.color}
                    className="h-9 w-16 cursor-pointer rounded border border-border"
                    onChange={(e) => update(i, { color: e.target.value })}
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={s.inset}
                    onChange={(e) => update(i, { inset: e.target.checked })}
                  />
                  Inset
                </label>
              </div>
            </div>
          ))}
          {shadows.length < 6 && (
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => setShadows((prev) => [...prev, defaultShadow()])}
            >
              + Add shadow layer
            </button>
          )}
        </div>
      </Panel>
      <Panel title="Preview">
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <Field label="Background">
            <input
              type="color"
              value={bgColor}
              className="h-9 w-16 cursor-pointer rounded border border-border"
              onChange={(e) => setBgColor(e.target.value)}
            />
          </Field>
          <Field label="Box color">
            <input
              type="color"
              value={boxColor}
              className="h-9 w-16 cursor-pointer rounded border border-border"
              onChange={(e) => setBoxColor(e.target.value)}
            />
          </Field>
        </div>
        <div
          className="flex items-center justify-center rounded-xl p-10"
          style={{ backgroundColor: bgColor }}
        >
          <div
            className="h-32 w-32 rounded-xl transition-all"
            style={{ backgroundColor: boxColor, boxShadow: css }}
          />
        </div>
      </Panel>
      <Panel title="CSS output">
        <CodeBlock>{cssOutput}</CodeBlock>
        <ExportActions value={tailwindNote} filename="shadow.css" label="Copy CSS" />
      </Panel>
    </div>
  );
}
