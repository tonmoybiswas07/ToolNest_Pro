"use client";

import { Input } from "@/components/ui/input";
import { Field } from "./shared";

export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  unit = "",
  change,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  change: (value: number) => void;
}) {
  return (
    <Field label={`${label} · ${value}${unit}`}>
      <input
        type="range"
        className="w-full accent-primary"
        min={min}
        max={max}
        value={value}
        onChange={(event) => change(Number(event.target.value))}
      />
    </Field>
  );
}

export function Picker({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
}) {
  return (
    <div className="flex items-end gap-2">
      <Field label={label}>
        <Input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          className="w-15 p-1"
          onChange={(event) => change(event.target.value)}
        />
      </Field>
      <Input
        aria-label={`${label} HEX`}
        className="max-w-36 font-mono"
        value={value}
        maxLength={7}
        onChange={(event) => change(event.target.value)}
      />
    </div>
  );
}
