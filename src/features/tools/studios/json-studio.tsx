"use client";

import { useState } from "react";
import { isLosslessNumber } from "lossless-json";
import { createTwoFilesPatch } from "diff";
import { Button } from "@/components/ui/button";
import { Editor } from "./editor";
import { inferType, jsonText, MAX_JSON, parseJson } from "./data-engines";
import {
  Actions,
  CodeBlock,
  ExportActions,
  Notice,
  readLocalFile,
  type StudioProps,
  useOperation,
  Workspace,
} from "./shared";

function TreeNode({
  name,
  value,
  depth = 0,
}: {
  name: string;
  value: unknown;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  if (depth > 40) return <p>Depth limit reached.</p>;
  if (value === null || typeof value !== "object" || isLosslessNumber(value))
    return (
      <div className="wrap-break-word">
        {name}: {jsonText(value)}
      </div>
    );
  const entries = Object.entries(value);
  return (
    <details
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary className="cursor-pointer wrap-break-word">
        {name} · {Array.isArray(value) ? "Array" : "Object"} ({entries.length})
      </summary>
      {expanded && (
        <div className="border-l border-border pl-2">
          {entries.slice(0, 200).map(([key, item]) => (
            <TreeNode key={key} name={key} value={item} depth={depth + 1} />
          ))}
          {entries.length > 200 && (
            <p>{entries.length - 200} more entries in the JSON output.</p>
          )}
        </div>
      )}
    </details>
  );
}

type Mode =
  "Format" | "Minify" | "Validate" | "Tree" | "Compare" | "TypeScript";

export default function JsonStudio({ slug }: StudioProps) {
  const [source, setSource] = useState("");
  const [other, setOther] = useState("");
  const [compare, setCompare] = useState(false);
  const [fileError, setFileError] = useState("");
  const { output, error, busy, run, clear } = useOperation<{
    text: string;
    mode: Mode;
    tree?: unknown;
  }>(slug);

  function execute(mode: Mode) {
    void run(() => {
      const value = parseJson(source);
      const formatted = jsonText(value, 2);
      if (mode === "Compare") {
        const second = jsonText(parseJson(other), 2);
        const text =
          formatted === second
            ? "The JSON documents match after formatting."
            : createTwoFilesPatch(
                "original.json",
                "modified.json",
                formatted + "\n",
                second + "\n",
                "",
                "",
                { timeout: 450 },
              );
        if (!text)
          throw new Error(
            "This comparison took too long. Try smaller documents.",
          );
        return { text, mode };
      }
      if (mode === "TypeScript")
        return {
          text: `export type JsonDocument = ${inferType(value)};\n`,
          mode,
        };
      if (mode === "Tree") return { text: formatted, mode, tree: value };
      return { text: mode === "Minify" ? jsonText(value) : formatted, mode };
    });
  }

  return (
    <Workspace
      input={
        <>
          <Editor
            label="JSON document"
            language="json"
            value={source}
            onChange={setSource}
            maxLength={MAX_JSON}
          />
          <label className="block text-sm font-medium">
            Upload JSON
            <input
              className="mt-2 block w-full text-sm"
              type="file"
              accept=".json,application/json"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setFileError("");
                try {
                  setSource(await readLocalFile(file, MAX_JSON));
                  clear();
                } catch (error) {
                  setFileError(
                    error instanceof Error
                      ? error.message
                      : "The file could not be read.",
                  );
                }
              }}
            />
          </label>
          {fileError && <Notice error>{fileError}</Notice>}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={compare}
              onChange={(event) => setCompare(event.target.checked)}
            />{" "}
            Compare two documents
          </label>
          {compare && (
            <Editor
              label="Comparison document"
              language="json"
              value={other}
              onChange={setOther}
              maxLength={MAX_JSON}
            />
          )}
          <Actions>
            {(
              [
                "Format",
                "Minify",
                "Validate",
                "Tree",
                "TypeScript",
                ...(compare ? ["Compare"] : []),
              ] as Mode[]
            ).map((mode) => (
              <Button
                type="button"
                key={mode}
                variant={mode === "Format" ? "default" : "outline"}
                disabled={busy}
                onClick={() => execute(mode)}
              >
                {mode}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSource("");
                setOther("");
                setCompare(false);
                setFileError("");
                clear();
              }}
            >
              Reset
            </Button>
          </Actions>
        </>
      }
      output={
        <>
          {error && <Notice error>{error}</Notice>}
          {output ? (
            <>
              {output.mode === "Validate" && <Notice>Valid JSON.</Notice>}
              {output.mode === "Tree" ? (
                <div className="max-h-96 overflow-auto rounded-xl border border-border p-3 font-mono text-sm">
                  <TreeNode name="Root" value={output.tree} />
                </div>
              ) : (
                <CodeBlock>{output.text}</CodeBlock>
              )}
              <ExportActions
                value={output.text}
                filename={
                  output.mode === "TypeScript"
                    ? "document.ts"
                    : output.mode === "Compare"
                      ? "comparison.diff"
                      : "document.json"
                }
              />
            </>
          ) : (
            !error && <Notice>Choose an operation to see its result.</Notice>
          )}
        </>
      }
    />
  );
}
