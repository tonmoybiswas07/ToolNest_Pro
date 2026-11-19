"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Actions,
  copyText,
  Field,
  Notice,
  type StudioProps,
  TextArea,
  trackOperation,
  Workspace,
} from "./shared";
import type { matchRegex } from "./regex-engine";

const examples = [
  { label: "Email addresses", pattern: "[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}" },
  {
    label: "Named date groups",
    pattern: "(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})",
  },
  { label: "Repeated words", pattern: "\\b(\\w+)\\s+\\1\\b" },
];
const flagOptions = [
  ["g", "Global"],
  ["i", "Ignore case"],
  ["m", "Multiline"],
  ["s", "DotAll"],
] as const;
type Results = ReturnType<typeof matchRegex>;
type Result = { key: string; output?: Results; error?: string };

export default function RegexLab({ slug }: StudioProps) {
  const [pattern, setPattern] = useState("");
  const [text, setText] = useState("");
  const [flags, setFlags] = useState("g");
  const [result, setResult] = useState<Result>();
  const key = JSON.stringify([pattern, text, flags]);

  useEffect(() => {
    if (!pattern) return;
    let worker: Worker | undefined;
    let deadline: number | undefined;
    let settled = false;
    const finish = (response: Omit<Result, "key">) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(deadline);
      worker?.terminate();
      setResult({ key, ...response });
      trackOperation(slug, Boolean(response.output));
    };

    const debounce = window.setTimeout(() => {
      try {
        worker = new Worker(new URL("./regex.worker.ts", import.meta.url), {
          type: "module",
        });
        deadline = window.setTimeout(
          () =>
            finish({
              error:
                "Matching exceeded the time limit. Simplify the pattern or shorten the text.",
            }),
          900,
        );
        worker.onmessage = ({ data }: MessageEvent<Omit<Result, "key">>) =>
          finish(data);
        worker.onerror = () =>
          finish({ error: "The matching worker could not run." });
        worker.postMessage({ pattern, text, flags });
      } catch {
        finish({ error: "The matching worker could not start." });
      }
    }, 350);

    return () => {
      settled = true;
      window.clearTimeout(debounce);
      window.clearTimeout(deadline);
      worker?.terminate();
    };
  }, [flags, key, pattern, slug, text]);

  const current = result?.key === key ? result : undefined;
  const matches = current?.output?.matches ?? [];
  const fragments = matches.map((match, index) => {
    const prior = matches[index - 1];
    const start = prior ? prior.index + prior.text.length : 0;
    return (
      <span key={`${match.index}-${index}`}>
        {text.slice(start, match.index)}
        <mark className="rounded bg-highlight/30 text-foreground">
          {match.text || "∅"}
        </mark>
      </span>
    );
  });
  const last = matches.at(-1);
  const tail = text.slice(last ? last.index + last.text.length : 0);

  return (
    <Workspace
      input={
        <>
          <Field label="Pattern">
            <Input
              value={pattern}
              maxLength={500}
              onChange={(event) => setPattern(event.target.value)}
              className="font-mono"
            />
          </Field>
          <fieldset className="flex flex-wrap gap-3 text-sm">
            <legend className="mb-2 font-semibold">Flags</legend>
            {flagOptions.map(([flag, name]) => (
              <label key={flag} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={flags.includes(flag)}
                  onChange={(event) =>
                    setFlags(
                      event.target.checked
                        ? flags + flag
                        : flags.replace(flag, ""),
                    )
                  }
                />
                {name}
              </label>
            ))}
          </fieldset>
          <Field label="Test string">
            <TextArea
              value={text}
              maxLength={30000}
              onChange={(event) => setText(event.target.value)}
              className="font-mono"
            />
          </Field>
          <Actions>
            {examples.map((example) => (
              <Button
                type="button"
                variant="outline"
                key={example.label}
                onClick={() => setPattern(example.pattern)}
              >
                {example.label}
              </Button>
            ))}
          </Actions>
          <Actions>
            <Button
              type="button"
              variant="outline"
              disabled={!pattern}
              onClick={() =>
                void copyText(
                  `/${pattern.replace(/(^|[^\\])\//g, "$1\\/")}/${flags}`,
                )
              }
            >
              Copy regex
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPattern("");
                setText("");
                setFlags("g");
                setResult(undefined);
              }}
            >
              Reset
            </Button>
          </Actions>
        </>
      }
      output={
        <>
          {!pattern && <Notice>Enter a pattern to start matching.</Notice>}
          {pattern && !current && <Notice>Matching…</Notice>}
          {current?.error && <Notice error>{current.error}</Notice>}
          {current?.output && (
            <>
              <Notice>
                {current.output.truncated
                  ? "Showing the first 500 matches."
                  : `${matches.length} ${matches.length === 1 ? "match" : "matches"}`}
              </Notice>
              <div className="max-h-64 overflow-auto whitespace-pre-wrap wrap-break-word rounded-xl border border-border bg-background p-3 font-mono text-sm">
                {fragments}
                {tail}
              </div>
              {matches.some((match) => match.groups.length) && (
                <div className="max-h-64 space-y-2 overflow-auto text-sm">
                  <h3 className="font-semibold">Capture groups</h3>
                  {current.output.capturesTruncated && <Notice>Long capture values are shortened in this preview.</Notice>}
                  {matches
                    .filter((match) => match.groups.length)
                    .map((match) => (
                      <p key={match.index} className="wrap-break-word">
                        At {match.index}: {JSON.stringify(match.groups)}
                        {Object.keys(match.named).length
                          ? ` · ${JSON.stringify(match.named)}`
                          : ""}
                      </p>
                    ))}
                </div>
              )}
            </>
          )}
        </>
      }
    />
  );
}
