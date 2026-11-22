"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  CodeBlock,
  ExportActions,
  Field,
  Panel,
  selectClass,
} from "./shared";

const ratios: Record<string, number> = {
  "Minor Second (1.067)": 1.067,
  "Major Second (1.125)": 1.125,
  "Minor Third (1.2)": 1.2,
  "Major Third (1.25)": 1.25,
  "Perfect Fourth (1.333)": 1.333,
  "Augmented Fourth (1.414)": 1.414,
  "Perfect Fifth (1.5)": 1.5,
  "Golden Ratio (1.618)": 1.618,
};

const steps = ["-2", "-1", "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl"];

function buildScale(base: number, ratio: number) {
  const baseIndex = steps.indexOf("base");
  return steps.map((step, i) => {
    const exp = i - baseIndex;
    const size = base * Math.pow(ratio, exp);
    return { step, px: Math.round(size * 100) / 100, rem: Math.round((size / 16) * 1000) / 1000 };
  });
}

export default function TypographyScale() {
  const [base, setBase] = useState(16);
  const [ratioKey, setRatioKey] = useState("Perfect Fourth (1.333)");
  const ratio = ratios[ratioKey] ?? 1.333;
  const scale = buildScale(base, ratio);

  const css = `:root {\n${scale.map((s) => `  --text-${s.step}: ${s.rem}rem;`).join("\n")}\n}`;
  const tailwind = `@theme {\n${scale.map((s) => `  --text-${s.step}: ${s.rem}rem;`).join("\n")}\n}`;

  return (
    <div className="mt-8 grid gap-4">
      <Panel title="Scale settings">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Base size (px)">
            <Input
              type="number"
              min={8}
              max={32}
              value={base}
              onChange={(e) => setBase(Math.min(32, Math.max(8, Number(e.target.value))))}
            />
          </Field>
          <Field label="Scale ratio">
            <select
              className={selectClass}
              value={ratioKey}
              onChange={(e) => setRatioKey(e.target.value)}
            >
              {Object.keys(ratios).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </Field>
        </div>
      </Panel>
      <Panel title="Type preview">
        <div className="space-y-3">
          {[...scale].reverse().map((s) => (
            <div key={s.step} className="flex items-baseline gap-3 border-b border-border pb-2 last:border-0">
              <span
                className="shrink-0 font-medium leading-none"
                style={{ fontSize: `${s.rem}rem`, lineHeight: 1.2 }}
              >
                Aa
              </span>
              <span className="text-xs text-muted-foreground">
                {s.step} · {s.px}px · {s.rem}rem
              </span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="CSS / Tailwind output">
        <CodeBlock>{css}</CodeBlock>
        <ExportActions value={tailwind} filename="typography.css" label="Copy Tailwind @theme" />
      </Panel>
    </div>
  );
}
