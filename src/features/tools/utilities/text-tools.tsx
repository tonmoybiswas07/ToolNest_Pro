"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Field,
  Notice,
  selectClass,
  TextArea,
  useOperation,
  type StudioProps,
} from "../studios/shared";
import { convertColor } from "../studios/design-engines";
import { Utility, LocaleField, TextOutput } from "./interface";
import {
  caseModes,
  convertCase,
  countText,
  textLimit,
  transformUrl,
  type CaseMode,
  type UrlMode,
} from "./text-engines";

export function UrlTool({ slug }: StudioProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<UrlMode>("component");
  const [direction, setDirection] = useState("encode");
  const job = useOperation<string>(slug);
  const descriptions = {
    component:
      "Encode one URL component, such as a path segment or query value. Reserved characters are escaped.",
    uri: "Transform a full URI while preserving structural separators such as /, ? and #.",
    form: "Transform one application/x-www-form-urlencoded value. A space encodes as +, and a literal plus encodes as %2B.",
  };
  return (
    <Utility
      job={job}
      label={direction === "encode" ? "Encode" : "Decode"}
      submit={() =>
        void job.run(() => transformUrl(input, mode, direction === "decode"))
      }
      reset={() => {
        setInput("");
        setMode("component");
        setDirection("encode");
      }}
      fields={
        <>
          <Field label="URL mode">
            <select
              className={selectClass}
              value={mode}
              onChange={(event) => setMode(event.target.value as UrlMode)}
            >
              <option value="component">URL component</option>
              <option value="uri">Full URI</option>
              <option value="form">Form query value</option>
            </select>
          </Field>
          <Notice>
            {descriptions[mode]} Text is processed locally and never opened as a
            link.
          </Notice>
          <Field label="Direction">
            <select
              className={selectClass}
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
            >
              <option value="encode">Encode</option>
              <option value="decode">Decode</option>
            </select>
          </Field>
          <Field label="URL text">
            <TextArea
              value={input}
              maxLength={textLimit}
              onChange={(event) => setInput(event.target.value)}
            />
          </Field>
        </>
      }
      render={(value) => <TextOutput value={value} />}
    />
  );
}

export function WordTool({ slug }: StudioProps) {
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState("200");
  const [locale, setLocale] = useState("");
  const job = useOperation<ReturnType<typeof countText>>(slug);
  return (
    <Utility
      job={job}
      label="Count text"
      submit={() => void job.run(() => countText(text, Number(speed), locale))}
      reset={() => {
        setText("");
        setSpeed("200");
        setLocale("");
      }}
      fields={
        <>
          <Field label="Text to count">
            <TextArea
              maxLength={textLimit}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </Field>
          <Field label="Reading speed (words per minute)">
            <Input
              type="number"
              min={1}
              max={1200}
              value={speed}
              onChange={(event) => setSpeed(event.target.value)}
            />
          </Field>
          <LocaleField locale={locale} setLocale={setLocale} />
          <Notice>
            Characters count Unicode code points. Graphemes count visible
            character clusters. Blank lines separate paragraphs.
          </Notice>
        </>
      }
      render={(stats) => (
        <>
          {stats.approximateSegmentation && (
            <Notice>
              This browser uses approximate word segmentation and counts code
              points as graphemes.
            </Notice>
          )}
          <TextOutput
            label="Copy statistics"
            value={[
              `Words: ${stats.words}`,
              `Graphemes: ${stats.graphemes}`,
              `Characters: ${stats.characters}`,
              `Characters without whitespace: ${stats.withoutWhitespace}`,
              `Lines: ${stats.lines}`,
              `Paragraphs: ${stats.paragraphs}`,
              `Estimated reading time: ${Math.floor(stats.readingSeconds / 60)} min ${stats.readingSeconds % 60} sec`,
            ].join("\n")}
          />
        </>
      )}
    />
  );
}

export function CaseTool({ slug }: StudioProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<CaseMode>("Uppercase");
  const [locale, setLocale] = useState("");
  const job = useOperation<string>(slug);
  return (
    <Utility
      job={job}
      label="Convert case"
      submit={() => void job.run(() => convertCase(text, mode, locale))}
      reset={() => {
        setText("");
        setMode("Uppercase");
        setLocale("");
      }}
      fields={
        <>
          <Field label="Text to convert">
            <TextArea
              maxLength={textLimit}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </Field>
          <Field label="Case style">
            <select
              className={selectClass}
              value={mode}
              onChange={(event) => setMode(event.target.value as CaseMode)}
            >
              {caseModes.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <LocaleField locale={locale} setLocale={setLocale} />
          <Notice>
            Title and sentence case normalize acronyms. Identifier styles split
            camel-case boundaries and replace punctuation with the selected
            separator.
          </Notice>
        </>
      }
      render={(value) => (
        <TextOutput value={value} filename="converted-text.txt" />
      )}
    />
  );
}

export function ColorTool({ slug }: StudioProps) {
  const [input, setInput] = useState("");
  const job = useOperation<ReturnType<typeof convertColor>>(slug);
  let swatch: string | undefined;
  try {
    swatch = convertColor(input).rgb;
  } catch {}
  return (
    <Utility
      job={job}
      label="Convert color"
      submit={() => void job.run(() => convertColor(input))}
      reset={() => setInput("")}
      fields={
        <>
          <Field label="CSS color">
            <Input
              value={input}
              maxLength={120}
              placeholder="#a78bfa80 or hsl(255 90% 75% / 50%)"
              onChange={(event) => setInput(event.target.value)}
            />
          </Field>
          <div className="h-20 overflow-hidden rounded-xl border border-border bg-[repeating-conic-gradient(var(--accent)_0%_25%,var(--background)_0%_50%)] bg-size-[20px_20px]">
            <div
              className="h-full"
              role="img"
              aria-label={
                swatch ? `Live swatch for ${swatch}` : "No color swatch"
              }
              style={{ backgroundColor: swatch }}
            />
          </div>
          <Notice>
            Supports HEX, RGB and HSL with optional alpha. HEX rounds RGB and
            alpha to eight bits per channel.
          </Notice>
        </>
      }
      render={(output) => (
        <TextOutput
          value={[output.hex, output.rgb, output.hsl].join("\n")}
          label="Copy CSS colors"
        />
      )}
    />
  );
}
