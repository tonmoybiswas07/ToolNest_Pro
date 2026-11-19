"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  Notice,
  selectClass,
  useOperation,
  type StudioProps,
} from "../studios/shared";
import { Utility, TextOutput } from "./interface";
import {
  calculatePercentage,
  decimal,
  formatNumber,
  percentModes,
  unitConversion,
  units,
  type PercentMode,
  type UnitCategory,
} from "./number-engines";
import { convertTimestamp, type Overlap, type TimeMode } from "./time-engine";

export function UnitTool({ slug }: StudioProps) {
  const [category, setCategory] = useState<UnitCategory>("Length");
  const [from, setFrom] = useState("Meter");
  const [to, setTo] = useState("Foot");
  const [value, setValue] = useState("");
  const [precision, setPrecision] = useState("10");
  const job = useOperation<string>(slug);
  const options = Object.keys(units[category]).map((unit) => (
    <option key={unit}>{unit}</option>
  ));

  return (
    <Utility
      job={job}
      label="Convert units"
      submit={() =>
        void job.run(() => {
          const input = decimal(value);
          const digits = Number(precision);
          return `${input} ${from} = ${formatNumber(unitConversion(input, category, from, to), digits)} ${to}`;
        })
      }
      reset={() => {
        setCategory("Length");
        setFrom("Meter");
        setTo("Foot");
        setValue("");
        setPrecision("10");
      }}
      fields={
        <>
          <Field label="Unit category">
            <select
              className={selectClass}
              value={category}
              onChange={(event) => {
                const next = event.target.value as UnitCategory;
                const [first, second] = Object.keys(units[next]);
                setCategory(next);
                setFrom(first);
                setTo(second);
                job.clear();
              }}
            >
              {Object.keys(units).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Value">
            <Input
              inputMode="decimal"
              maxLength={60}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From unit">
              <select
                className={`${selectClass} min-w-0 w-full`}
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              >
                {options}
              </select>
            </Field>
            <Field label="To unit">
              <select
                className={`${selectClass} min-w-0 w-full`}
                value={to}
                onChange={(event) => setTo(event.target.value)}
              >
                {options}
              </select>
            </Field>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFrom(to);
              setTo(from);
              job.clear();
            }}
          >
            Swap units
          </Button>
          <Field label="Significant digits">
            <Input
              type="number"
              min={1}
              max={15}
              value={precision}
              onChange={(event) => setPrecision(event.target.value)}
            />
          </Field>
          <Notice>
            US liquid and Imperial measures use separate definitions. Kilobytes
            are decimal and kibibytes are binary.
          </Notice>
        </>
      }
      render={(result) => <TextOutput value={result} label="Copy result" />}
    />
  );
}

export function PercentTool({ slug }: StudioProps) {
  const [mode, setMode] = useState<PercentMode>("of");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const job = useOperation<ReturnType<typeof calculatePercentage>>(slug);
  const current = percentModes[mode];
  return (
    <Utility
      job={job}
      label="Calculate"
      submit={() =>
        void job.run(() =>
          calculatePercentage(mode, decimal(first), decimal(second)),
        )
      }
      reset={() => {
        setMode("of");
        setFirst("");
        setSecond("");
      }}
      fields={
        <>
          <Field label="Calculation">
            <select
              className={selectClass}
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as PercentMode);
                job.clear();
              }}
            >
              {Object.entries(percentModes).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={current.first}>
            <Input
              inputMode="decimal"
              maxLength={60}
              value={first}
              onChange={(event) => setFirst(event.target.value)}
            />
          </Field>
          <Field label={current.second}>
            <Input
              inputMode="decimal"
              maxLength={60}
              value={second}
              onChange={(event) => setSecond(event.target.value)}
            />
          </Field>
          <Notice>Formula: {current.formula}</Notice>
          {mode === "delta" && (
            <Notice>
              Percentage change divides by the signed original value. Interpret
              the sign carefully when the original value is negative.
            </Notice>
          )}
        </>
      }
      render={(result) => (
        <TextOutput
          value={`${formatNumber(result.value, 12)}${result.percent ? "%" : ""}\nFormula: ${result.formula}`}
          label="Copy result"
        />
      )}
    />
  );
}

const timeModes = {
  seconds: "Unix seconds",
  milliseconds: "Unix milliseconds",
  iso: "ISO 8601 with offset",
  local: "Local date and time",
} satisfies Record<TimeMode, string>;

export function TimeTool({ slug }: StudioProps) {
  const [mode, setMode] = useState<TimeMode>("seconds");
  const [input, setInput] = useState("");
  const [zone, setZone] = useState("UTC");
  const [overlap, setOverlap] = useState<Overlap>("reject");
  const [zones] = useState(() => [
    "UTC",
    ...new Set(
      typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("timeZone")
        : ["Asia/Dhaka", "America/New_York", "Europe/London"],
    ),
  ]);
  const list = useId();
  const job = useOperation<Awaited<ReturnType<typeof convertTimestamp>>>(slug);
  const examples = {
    seconds: "1730611800",
    milliseconds: "1730611800000",
    iso: "2025-11-02T01:30:00-04:00",
    local: "2025-11-02T01:30",
  };
  return (
    <Utility
      job={job}
      label="Convert timestamp"
      submit={() =>
        void job.run(() => convertTimestamp(input, mode, zone, overlap))
      }
      reset={() => {
        setMode("seconds");
        setInput("");
        setZone("UTC");
        setOverlap("reject");
      }}
      fields={
        <>
          <Field label="Input format">
            <select
              className={selectClass}
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as TimeMode);
                setInput("");
                job.clear();
              }}
            >
              {Object.entries(timeModes).map(([key, name]) => (
                <option value={key} key={key}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={timeModes[mode]}>
            <Input
              inputMode={
                mode === "seconds" || mode === "milliseconds"
                  ? "decimal"
                  : "text"
              }
              maxLength={60}
              placeholder={examples[mode]}
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
          </Field>
          <Field label="IANA time zone">
            <Input
              list={list}
              maxLength={80}
              value={zone}
              onChange={(event) => setZone(event.target.value)}
            />
          </Field>
          <datalist id={list}>
            {zones.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          {mode === "local" && (
            <>
              <Field label="Repeated local time">
                <select
                  className={selectClass}
                  value={overlap}
                  onChange={(event) =>
                    setOverlap(event.target.value as Overlap)
                  }
                >
                  <option value="reject">Ask for a choice</option>
                  <option value="earlier">Earlier occurrence</option>
                  <option value="later">Later occurrence</option>
                </select>
              </Field>
              <Notice>
                Local input is interpreted in the selected zone. Skipped clock
                times are rejected.
              </Notice>
            </>
          )}
        </>
      }
      render={(output) => (
        <>
          {output.overlapLabel && <Notice>{output.overlapLabel}</Notice>}
          <TextOutput
            label="Copy timestamps"
            value={[
              `ISO 8601: ${output.iso}`,
              `UTC: ${output.utc}`,
              `${output.zone}: ${output.zoned}`,
              `Unix seconds: ${output.seconds}`,
              `Unix milliseconds: ${output.milliseconds}`,
            ].join("\n")}
          />
        </>
      )}
    />
  );
}
