"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { colorScale, rgbFromHex } from "./design-engines";
import { Picker } from "./design-controls";
import {
  Actions,
  CodeBlock,
  ExportActions,
  Notice,
  useLiveMetric,
  Workspace,
  type StudioProps,
} from "./shared";

function rating(value: number) {
  if (value >= 7) return "AAA normal";
  if (value >= 4.5) return "AA normal · AAA large";
  if (value >= 3) return "AA large only";
  return "Below AA";
}

export default function ColorSystem({ slug }: StudioProps) {
  const [base, setBase] = useState("#7048e8");
  const [changed, setChanged] = useState(false);
  let scale: ReturnType<typeof colorScale> = [];
  try {
    scale = colorScale(rgbFromHex(base));
  } catch {}
  const variables = scale
    .map((shade) => `  --palette-${shade.level}: ${shade.hex};`)
    .join("\n");
  const tailwind = scale
    .map((shade) => `  --color-brand-${shade.level}: ${shade.hex};`)
    .join("\n");
  const css = scale.length
    ? `:root {\n${variables}\n}\n\n@theme {\n${tailwind}\n}\n`
    : "";
  useLiveMetric(slug, css, changed);

  return (
    <Workspace
      input={
        <>
          <Picker
            label="Base color"
            value={base}
            change={(value) => {
              setBase(value);
              setChanged(true);
            }}
          />
          <Notice>
            Contrast labels apply to the displayed black or white text on each
            shade. WCAG ratios use the unrounded values.
          </Notice>
          <Actions>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setBase("#7048e8");
                setChanged(false);
              }}
            >
              Reset
            </Button>
          </Actions>
        </>
      }
      output={
        scale.length ? (
          <>
            <div className="grid max-h-96 gap-3 overflow-auto">
              {scale.map((shade) => (
                <div
                  key={shade.level}
                  className="grid gap-2 rounded-xl border border-border p-3 text-sm"
                >
                  <p className="font-semibold">
                    {shade.level} · {shade.hex} · {shade.rgb} · {shade.hsl}
                  </p>
                  <div
                    aria-hidden
                    className="flex justify-between rounded-lg border border-border px-3 py-2 font-bold"
                    style={{ background: shade.hex }}
                  >
                    <span className="text-black">Aa</span>
                    <span className="text-white">Aa</span>
                  </div>
                  <p>
                    Black {shade.black.toFixed(2)}:1 · {rating(shade.black)}
                  </p>
                  <p>
                    White {shade.white.toFixed(2)}:1 · {rating(shade.white)}
                  </p>
                </div>
              ))}
            </div>
            <CodeBlock>{css}</CodeBlock>
            <ExportActions
              value={css}
              filename="color-system.css"
              type="text/css"
              label="Copy palette"
            />
          </>
        ) : (
          <Notice error>Enter a valid 3- or 6-digit HEX color.</Notice>
        )
      }
    />
  );
}
