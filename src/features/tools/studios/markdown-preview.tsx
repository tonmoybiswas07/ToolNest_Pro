"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import {
  Actions,
  ExportActions,
  Field,
  Notice,
  Panel,
  selectClass,
  TextArea,
  downloadFile,
} from "./shared";

const MAX = 100_000;

const examples: Record<string, string> = {
  Empty: "",
  Demo: `# Hello, Markdown!\n\nThis is a **bold** word and this is *italic*.\n\n## Code\n\n\`\`\`js\nconsole.log("Hello!");\n\`\`\`\n\n## List\n\n- Item one\n- Item two\n- Item three\n\n> A blockquote example.\n`,
};

export default function MarkdownPreview() {
  const [source, setSource] = useState(examples.Demo);
  const [view, setView] = useState<"split" | "preview" | "source">("split");

  function exportHtml() {
    const wrapper = `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><title>Markdown Export</title></head>\n<body>\n<div id="content">\n${document.getElementById("md-preview")?.innerHTML ?? ""}\n</div>\n</body>\n</html>`;
    downloadFile("export.html", new Blob([wrapper], { type: "text/html" }));
  }

  return (
    <div className="mt-8 grid gap-4">
      <Panel title="Markdown editor">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Field label="View">
            <select
              className={selectClass}
              value={view}
              onChange={(e) => setView(e.target.value as typeof view)}
            >
              <option value="split">Split</option>
              <option value="source">Source only</option>
              <option value="preview">Preview only</option>
            </select>
          </Field>
          <Field label="Load example">
            <select
              className={selectClass}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) setSource(examples[e.target.value] ?? "");
                e.target.value = "";
              }}
            >
              <option value="" disabled>Select…</option>
              {Object.keys(examples).filter(Boolean).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className={`grid gap-4 ${view === "split" ? "lg:grid-cols-2" : ""}`}>
          {(view === "split" || view === "source") && (
            <TextArea
              aria-label="Markdown source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              maxLength={MAX}
            />
          )}
          {(view === "split" || view === "preview") && (
            <div className="rounded-xl border border-border p-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
              <div
                id="md-preview"
                className="prose prose-sm dark:prose-invert max-w-none min-h-32"
              >
                <ReactMarkdown>{source}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
        <Actions>
          <Button type="button" variant="outline" onClick={exportHtml}>
            Export HTML
          </Button>
          <ExportActions value={source} filename="document.md" label="Download .md" />
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSource("")}
          >
            Clear
          </Button>
        </Actions>
        {!source && <Notice>Start typing Markdown above to see a live preview.</Notice>}
      </Panel>
    </div>
  );
}
