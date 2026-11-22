"use client";

import { Temporal } from "@js-temporal/polyfill";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeBlock, ExportActions, Field, Notice, selectClass, TextArea, useOperation, Workspace, type StudioProps } from "./shared";

type CalculatorField = {
  label: string;
  initial: string;
  kind?: "base" | "date" | "text" | "textarea";
  min?: number;
  max?: number;
  step?: number;
};

type Calculator = {
  fields: CalculatorField[];
  calculate: (values: string[]) => string;
};

const decimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });
const money = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function convertInteger([input, source, target]: string[]) {
  const from = Number(source);
  const to = Number(target);
  const value = input.trim().toLowerCase();
  if (!/^[+-]?[0-9a-z]{1,256}$/.test(value)) {
    throw new Error("Enter an integer with up to 256 digits and no base prefix.");
  }
  const negative = value.startsWith("-");
  let result = BigInt(0);
  for (const character of value.replace(/^[+-]/, "")) {
    const digit = parseInt(character, 36);
    if (digit >= from) throw new Error(`${character} is not a valid digit in base ${from}.`);
    result = result * BigInt(from) + BigInt(digit);
  }
  return (negative ? -result : result).toString(to).toUpperCase();
}

function greatestCommonDivisor(first: number, second: number) {
  while (second) {
    [first, second] = [second, first % second];
  }
  return first;
}

function parseDurations([value]: string[]) {
  const lines = value.trim().split(/\r?\n/).filter((line) => line.trim());
  const total = lines.reduce((seconds, line, index) => {
    const item = line.trim();
    const parts = item.split(":");
    if (
      parts.length < 2 || parts.length > 3 ||
      !/^\d{1,7}$/.test(parts[0]) ||
      !parts.slice(1).every((part) => /^\d{1,2}$/.test(part) && Number(part) < 60)
    ) {
      throw new Error(`Entry ${index + 1} needs MM:SS or HH:MM:SS.`);
    }
    return seconds + parts.reduce((subtotal, part) => subtotal * 60 + Number(part), 0);
  }, 0);
  if (!lines.length) throw new Error("Enter at least one duration.");
  const clock = [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
    .map((part) => String(part).padStart(2, "0")).join(":");
  return `${clock}\n${decimal.format(total)} seconds\n${lines.length} entries`;
}

const calculators = {
  "number-base-converter": {
    fields: [
      { label: "Integer", initial: "255", kind: "text" },
      { label: "From base", initial: "10", kind: "base" },
      { label: "To base", initial: "16", kind: "base" },
    ],
    calculate: convertInteger,
  },
  "loan-calculator": {
    fields: [
      { label: "Loan amount", initial: "100000", min: 0.01, max: 1e12, step: 0.01 },
      { label: "Annual interest rate (%)", initial: "5", min: 0, max: 100, step: 0.001 },
      { label: "Term (months)", initial: "60", min: 1, max: 1200 },
    ],
    calculate: (values) => {
      const [principal, annualRate, months] = values.map(Number);
      const rate = annualRate / 1200;
      const monthly = rate ? principal * rate / -Math.expm1(-months * Math.log1p(rate)) : principal / months;
      const total = monthly * months;
      return [
        `Monthly payment     ${money.format(monthly)}`,
        `Total interest      ${money.format(Math.max(0, total - principal))}`,
        `Total repayment     ${money.format(total)}`,
        "",
        "Amounts use the same currency as the loan amount. Estimates exclude fees.",
      ].join("\n");
    },
  },
  "date-difference-calculator": {
    fields: [
      { label: "Start date", initial: "", kind: "date" },
      { label: "End date", initial: "", kind: "date" },
    ],
    calculate: ([start, end]) => {
      const difference = Temporal.PlainDate.from(start).until(Temporal.PlainDate.from(end)).days;
      const days = Math.abs(difference);
      return [
        `Calendar days: ${days}`,
        `Whole weeks: ${Math.floor(days / 7)}\nRemaining days: ${days % 7}`,
        "",
        difference < 0 ? "The end date comes before the start date." : "The start date is excluded from the elapsed count.",
      ].join("\n");
    },
  },
  "tip-calculator": {
    fields: [
      { label: "Bill amount", initial: "50", min: 0, max: 1e12, step: 0.01 },
      { label: "Tip (%)", initial: "15", min: 0, max: 1000, step: 0.01 },
      { label: "People", initial: "2", min: 1, max: 10000 },
    ],
    calculate: (values) => {
      const [billAmount, rate, people] = values.map(Number);
      const bill = Math.round(billAmount * 100);
      const tip = Number((BigInt(bill) * BigInt(Math.round(rate * 100)) + BigInt(5000)) / BigInt(10000));
      const total = bill + tip;
      const share = Math.floor(total / people);
      const extra = total % people;
      return [
        `Tip                 ${money.format(tip / 100)}`,
        `Total               ${money.format(total / 100)}`,
        extra
          ? `Split               ${extra} × ${money.format((share + 1) / 100)} and ${people - extra} × ${money.format(share / 100)}`
          : `Per person          ${money.format(share / 100)}`,
      ].join("\n");
    },
  },
  "aspect-ratio-calculator": {
    fields: [
      { label: "Original width", initial: "1920", min: 1, max: 1e9 },
      { label: "Original height", initial: "1080", min: 1, max: 1e9 },
      { label: "New width", initial: "1280", min: 1, max: 1e9 },
    ],
    calculate: (values) => {
      const [width, height, target] = values.map(Number);
      const divisor = greatestCommonDivisor(width, height);
      const newHeight = target / width * height;
      return `Ratio: ${width / divisor}:${height / divisor}\nNew height: ${decimal.format(newHeight)}\nRounded height: ${decimal.format(Math.round(newHeight))}`;
    },
  },
  "duration-calculator": {
    fields: [{ label: "Durations, one per line (MM:SS or HH:MM:SS)", initial: "30:00\n1:15:30", kind: "textarea" }],
    calculate: parseDurations,
  },
} satisfies Record<string, Calculator>;

function CalculatorWorkspace({ slug, calculator }: StudioProps & { calculator: Calculator }) {
  const [values, setValues] = useState(() => calculator.fields.map((field) => field.initial));
  const { run, output, error, busy, clear } = useOperation<string>(slug);

  function update(index: number, value: string) {
    setValues((previous) => previous.map((entry, position) => position === index ? value : entry));
    clear();
  }

  function fieldInput(field: CalculatorField, index: number) {
    const value = values[index];
    if (field.kind === "base") {
      return (
        <select className={selectClass} value={value} onChange={(event) => update(index, event.target.value)}>
          {Array.from({ length: 35 }, (_, offset) => offset + 2)
            .map((base) => <option key={base} value={base}>{base}</option>)}
        </select>
      );
    }
    if (field.kind === "textarea") {
      return <TextArea value={value} maxLength={32000} required onChange={(event) => update(index, event.target.value)} />;
    }
    return (
      <Input type={field.kind ?? "number"} value={value} required
        min={field.min} max={field.max} step={field.step} maxLength={257}
        onChange={(event) => update(index, event.target.value)} />
    );
  }

  return (
    <Workspace input={
      <form className="grid gap-4" onSubmit={(event) => {
        event.preventDefault();
        void run(() => calculator.calculate(values));
      }}>
        {calculator.fields.map((field, index) => (
          <Field key={field.label} label={field.label}>{fieldInput(field, index)}</Field>
        ))}
        <Button type="submit" className="justify-self-start" disabled={busy}>
          {slug === "number-base-converter" ? "Convert" : "Calculate"}
        </Button>
      </form>
    } output={error ? <Notice error>{error}</Notice> : output ? (
      <><CodeBlock>{output}</CodeBlock><ExportActions value={output} /></>
    ) : <Notice>Run the calculator to see the result.</Notice>} />
  );
}

export default function Calculators({ slug }: StudioProps) {
  const calculator = calculators[slug as keyof typeof calculators];
  return calculator && <CalculatorWorkspace key={slug} calculator={calculator} slug={slug} />;
}
