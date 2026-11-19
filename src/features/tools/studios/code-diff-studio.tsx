"use client";

import { useEffect, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { MergeView } from "@codemirror/merge";
import { createTwoFilesPatch, diffLines } from "diff";
import { Button } from "@/components/ui/button";
import { Editor, editorExtensions, type Language } from "./editor";
import {
  Actions,
  ExportActions,
  Field,
  Notice,
  Panel,
  selectClass,
  type StudioProps,
  useOperation,
} from "./shared";

const LIMIT = 80000;

function DiffView({
  original,
  modified,
  language,
}: {
  original: string;
  modified: string;
  language: Language;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const config = (doc: string, name: string) => ({
      doc,
      extensions: [
        ...editorExtensions(language, name),
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
      ],
    });
    const view = new MergeView({
      a: config(original, "Original comparison"),
      b: config(modified, "Modified comparison"),
      parent: host.current ?? undefined,
      highlightChanges: true,
      gutter: true,
      diffConfig: { scanLimit: 500, timeout: 350 },
    });
    return () => view.destroy();
  }, [language, modified, original]);
  return (
    <div
      className="overflow-auto rounded-xl border border-border [&_.cm-mergeView]:min-w-[36rem] [&_.cm-mergeViewEditor]:min-w-0"
      ref={host}
    />
  );
}

function comparison(original: string, modified: string, language: Language) {
  const changes = diffLines(original, modified, { timeout: 400 });
  if (!changes)
    throw new Error("The comparison took too long. Try smaller inputs.");
  let added = 0;
  let removed = 0;
  let changed = 0;
  let priorRemoved = 0;
  for (const item of changes) {
    const count = item.count ?? 0;
    if (item.removed) {
      removed += count;
      priorRemoved = count;
    } else {
      if (item.added) {
        added += count;
        changed += Math.min(count, priorRemoved);
      }
      priorRemoved = 0;
    }
  }
  const patch =
    original === modified
      ? ""
      : createTwoFilesPatch(
          "original",
          "modified",
          original,
          modified,
          "",
          "",
          { timeout: 400 },
        );
  if (patch === undefined)
    throw new Error("The patch took too long to generate.");
  return { original, modified, language, added, removed, changed, patch };
}

export default function CodeDiff({ slug }: StudioProps) {
  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");
  const [language, setLanguage] = useState<Language>("javascript");
  const { output, error, busy, run, clear } =
    useOperation<ReturnType<typeof comparison>>(slug);
  return (
    <div className="mt-8 grid gap-4">
      <Panel title="Code inputs">
        <div className="max-w-xs">
          <Field label="Language">
            <select
              className={selectClass}
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              <option value="text">Plain text</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="json">JSON</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Editor
            label="Original code"
            language={language}
            value={original}
            onChange={setOriginal}
            maxLength={LIMIT}
          />
          <Editor
            label="Modified code"
            language={language}
            value={modified}
            onChange={setModified}
            maxLength={LIMIT}
          />
        </div>
        <Actions>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(() => comparison(original, modified, language))
            }
          >
            Compare code
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setOriginal("");
              setModified("");
              setLanguage("javascript");
              clear();
            }}
          >
            Reset
          </Button>
        </Actions>
      </Panel>
      <Panel title="Side-by-side comparison">
        {error && <Notice error>{error}</Notice>}
        {output ? (
          <>
            <Notice>
              {output.patch
                ? `${output.added} added · ${output.removed} removed · ${output.changed} paired changes`
                : "The two inputs are identical."}
            </Notice>
            <div className="flex justify-between text-sm font-semibold">
              <span>Original</span>
              <span>Modified</span>
            </div>
            <DiffView
              original={output.original}
              modified={output.modified}
              language={output.language}
            />
            {output.patch && (
              <ExportActions
                value={output.patch}
                filename="comparison.diff"
                label="Copy patch"
              />
            )}
          </>
        ) : (
          !error && (
            <Notice>Compare your inputs to see highlighted changes.</Notice>
          )
        )}
      </Panel>
    </div>
  );
}
