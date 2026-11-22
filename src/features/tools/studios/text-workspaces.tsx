"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { jsonToCsv, MAX_JSON, parseJson } from "./data-engines";
import { CodeBlock, ExportActions, Field, Notice, readLocalFile, selectClass, TextArea, useOperation, Workspace, type StudioProps } from "./shared";

const translations: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function transformEntities(source: string, mode: string) {
  if (mode === "encode") return source.replace(/[&<>"']/g, (character) => translations[character]);
  const decoder = document.createElement("textarea");
  return source.replace(/&(?:#[0-9]+|#[xX][\da-fA-F]+|[A-Za-z][A-Za-z\d]*);/g, (entity) => {
    decoder.innerHTML = entity;
    return decoder.value;
  });
}

function parseQuery(source: string) {
  const value = source.trim();
  const path = value.split("#", 1)[0];
  const query = /^https?:\/\//i.test(value)
    ? new URL(value).search
    : path.startsWith("/") && path.includes("?") ? path.slice(path.indexOf("?") + 1) : path;
  const parameters = [...new URLSearchParams(query)];
  if (!parameters.length) throw new Error("Enter a URL with a query string or paste query parameters.");
  return JSON.stringify(parameters.map(([name, value]) => ({ name, value })), null, 2);
}

const alphabetic = new Intl.Collator(undefined, { sensitivity: "base" });
const natural = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

const configurations = {
  "json-to-csv": {
    label: "JSON object or array of objects",
    example: '[{"name":"Ana","grade":7},{"name":"Min","grade":9}]',
    filename: "records.csv",
    type: "text/csv;charset=utf-8",
    options: [["safe", "Spreadsheet-safe CSV"], ["literal", "Preserve formula-like text"]],
    run: (source: string, mode: string) => jsonToCsv(parseJson(source), mode === "safe"),
  },
  "url-query-parser": {
    label: "URL or query string",
    example: "https://example.com/?category=image&tag=png&tag=webp",
    filename: "parameters.json",
    type: "application/json;charset=utf-8",
    options: [],
    run: parseQuery,
  },
  "html-entity-converter": {
    label: "Text or HTML entities",
    example: "Coffee & tea <3",
    filename: "entities.txt",
    type: "text/plain;charset=utf-8",
    options: [["encode", "Encode text"], ["decode", "Decode entities"]],
    run: transformEntities,
  },
  "line-sorter": {
    label: "Lines to sort",
    example: "Image 12\nImage 2\nImage 1",
    filename: "sorted.txt",
    type: "text/plain;charset=utf-8",
    options: [["asc", "Alphabetical (A to Z)"], ["desc", "Alphabetical (Z to A)"], ["natural", "Natural numeric order"]],
    run: (source: string, mode: string) => source.replace(/\r\n?/g, "\n").split("\n")
      .sort((left, right) => mode === "desc" ? alphabetic.compare(right, left) : (mode === "natural" ? natural : alphabetic).compare(left, right))
      .join("\n"),
  },
  "text-cleaner": {
    label: "Text to clean",
    example: "  Alpha   Beta\n\n  Alpha Beta  \nGamma",
    filename: "cleaned.txt",
    type: "text/plain;charset=utf-8",
    options: [["clean", "Clean whitespace"], ["unique", "Clean whitespace and remove duplicate lines"]],
    run: (source: string, mode: string) => {
      const lines = source.replace(/\r\n?/g, "\n").split("\n")
        .map((line) => line.trim().replace(/[\t ]+/g, " ")).filter(Boolean);
      return (mode === "unique" ? [...new Set(lines)] : lines).join("\n");
    },
  },
};

type Configuration = (typeof configurations)[keyof typeof configurations];

function TextWorkspace({ configuration, slug }: StudioProps & { configuration: Configuration }) {
  const [source, setSource] = useState("");
  const [mode, setMode] = useState(configuration.options[0]?.[0] ?? "");
  const [fileError, setFileError] = useState("");
  const { output, error, busy, clear, run } = useOperation<string>(slug);
  return (
    <Workspace
      input={
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault();
          void run(() => configuration.run(source, mode));
        }}>
          <Field label={configuration.label}>
            <TextArea className="min-h-48 font-mono" value={source} maxLength={MAX_JSON} placeholder={configuration.example}
              onChange={(event) => { setSource(event.target.value); clear(); }} required />
          </Field>
          {slug === "json-to-csv" && (
            <Field label="Upload JSON">
              <input type="file" accept=".json,application/json" onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setFileError("");
                try {
                  setSource(await readLocalFile(file, MAX_JSON));
                  clear();
                } catch (failure) {
                  setFileError(failure instanceof Error ? failure.message : "The JSON could not be read.");
                }
              }} />
            </Field>
          )}
          {configuration.options.length > 0 && (
            <Field label="Mode">
              <select className={selectClass} value={mode} onChange={(event) => { setMode(event.target.value); clear(); }}>
                {configuration.options.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </Field>
          )}
          {fileError && <Notice error>{fileError}</Notice>}
          <Button type="submit" disabled={busy}>Run</Button>
        </form>
      }
      output={error ? <Notice error>{error}</Notice> : output === undefined ? (
        <Notice>Run the tool to see the result.</Notice>
      ) : (
        <>
          {output ? <CodeBlock>{output}</CodeBlock> : <Notice>The result is empty.</Notice>}
          <ExportActions value={output} filename={configuration.filename} type={configuration.type} />
        </>
      )}
    />
  );
}

export default function TextWorkspaces({ slug }: StudioProps) {
  const configuration = configurations[slug as keyof typeof configurations];
  return configuration && <TextWorkspace key={slug} configuration={configuration} slug={slug} />;
}
