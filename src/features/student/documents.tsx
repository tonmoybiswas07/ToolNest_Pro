"use client";

import { useEffect, useRef, useState } from "react";
import type { CSL } from "@citation-js/core";
import type { Worker as OcrWorker } from "tesseract.js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { validatePdf } from "@/features/tools/file-processing/files";
import type { CitationStyle } from "./citations";
import {
  Field,
  Form,
  OutputActions,
  Panel,
  Row,
  copyText,
  download,
  get,
  newId,
  operation,
  readable,
  replace,
  useStudent,
  without,
} from "./workspace";

const sourceTypes: [CSL["type"], string][] = [
  ["book", "Book"],
  ["article-journal", "Journal article"],
  ["webpage", "Website"],
  ["paper-conference", "Conference paper"],
  ["report", "Report"],
];

type Reference = CSL & { id: string };

export function Citations() {
  const [items, setItems] = useState<Reference[]>([]);
  const [editing, setEditing] = useState("");
  const [style, setStyle] = useState<CitationStyle>("apa");
  const [busy, setBusy] = useState(false);
  const [result, setResult] =
    useState<ReturnType<(typeof import("./citations"))["formatReferences"]>>();
  const entry = items.find((item) => item.id === editing);

  async function generate() {
    setBusy(true);
    try {
      const { formatReferences } = await import("./citations");
      let xml: string | undefined;
      if (style !== "apa") {
        const response = await fetch(`/student/csl/${style}.csl`);
        if (!response.ok) throw new Error("Style unavailable");
        xml = await response.text();
      }
      setResult(formatReferences(items, style, xml));
      operation("citation-generator", true);
    } catch {
      toast.error(
        "Could not format citations. Check your source information and try again.",
      );
      operation("citation-generator", false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Panel title={entry ? "Edit reference" : "Add a reference"}>
        <Form
          key={editing}
          reset
          label={entry ? "Update reference" : "Add reference"}
          onSave={async (form) => {
            const year = get(form, "year");
            const author = get(form, "authors")
              .split("\n")
              .filter(Boolean)
              .map((line) => {
                const [family, given] = line
                  .split(",")
                  .map((value) => value.trim());
                return given ? { family, given } : { literal: family };
              });
            const next: Reference = {
              id: entry?.id ?? newId(),
              type: get(form, "type") as CSL["type"],
              title: get(form, "title"),
              ...(author.length && { author }),
              ...(year && { issued: { "date-parts": [[Number(year)]] } }),
              publisher: get(form, "publisher") || undefined,
              DOI:
                get(form, "doi").replace(/^https?:\/\/doi\.org\//i, "") ||
                undefined,
              URL: get(form, "url") || undefined,
              "container-title": get(form, "container") || undefined,
              volume: get(form, "volume") || undefined,
              issue: get(form, "issue") || undefined,
              page: get(form, "pages") || undefined,
            };
            if (next.URL && !/^https?:\/\//i.test(next.URL))
              throw new Error("Enter an HTTPS or HTTP URL.");
            setItems(replace(items, next));
            setEditing("");
            setResult(undefined);
            return true;
          }}
        >
          <Field
            label="Source type"
            name="type"
            options={sourceTypes}
            value={entry?.type ?? "book"}
          />
          <Field label="Title" name="title" value={entry?.title} />
          <Field
            label="Authors (one Family, Given or organization per line)"
            name="authors"
            multiline
            optional
            value={entry?.author
              ?.map(
                (author) =>
                  author.literal ?? `${author.family}, ${author.given ?? ""}`,
              )
              .join("\n")}
          />
          <Field
            label="Year"
            name="year"
            type="number"
            min={1}
            max={9999}
            optional
            value={entry?.issued?.["date-parts"]?.[0]?.[0]}
          />
          <Field
            label="Publisher"
            name="publisher"
            optional
            value={entry?.publisher}
          />
          <Field
            label="Journal, conference, or website name"
            name="container"
            optional
            value={entry?.["container-title"]}
          />
          <Field label="Volume" name="volume" optional value={entry?.volume} />
          <Field label="Issue" name="issue" optional value={entry?.issue} />
          <Field label="Pages" name="pages" optional value={entry?.page} />
          <Field label="DOI" name="doi" optional value={entry?.DOI} />
          <Field
            label="URL"
            name="url"
            type="url"
            optional
            value={entry?.URL}
          />
          {entry && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing("")}
            >
              Cancel edit
            </Button>
          )}
        </Form>
      </Panel>
      <Panel title="Bibliography and in-text citations">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            Citation style
            <select
              className="student-input"
              aria-label="Citation style"
              value={style}
              disabled={busy}
              onChange={(event) => {
                setStyle(event.target.value as CitationStyle);
                setResult(undefined);
              }}
            >
              <option value="apa">APA</option>
              <option value="mla">MLA</option>
              <option value="ieee">IEEE</option>
            </select>
          </label>
          <Button
            disabled={!items.length || busy}
            onClick={() => void generate()}
          >
            {busy ? "Formatting…" : "Generate references"}
          </Button>
        </div>
        {!items.length && (
          <p className="mt-4 text-sm text-muted-foreground">
            Add sources to generate your bibliography.
          </p>
        )}
        <ul>
          {items.map((item) => {
            const citation = result?.inText.find(
              (row) => row.id === item.id,
            )?.value;
            return (
              <Row
                title={item.title ?? "Reference"}
                key={item.id}
                actions={
                  <>
                    {citation && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void copyText(citation)}
                      >
                        Copy citation
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setEditing(item.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        setItems(items.filter((row) => row.id !== item.id));
                        setResult(undefined);
                      }}
                    >
                      Remove
                    </Button>
                  </>
                }
              >
                {citation ??
                  sourceTypes.find(([type]) => type === item.type)?.[1]}
              </Row>
            );
          })}
        </ul>
        {result && (
          <div className="mt-4 grid gap-3">
            <pre className="rounded-lg bg-accent p-4 font-sans text-sm whitespace-pre-wrap wrap-anywhere">
              {result.bibliography}
            </pre>
            <OutputActions text={result.bibliography} name="references.txt" />
            <Button
              variant="outline"
              className="justify-self-start"
              onClick={() => {
                const parsed = document.createElement("template");
                parsed.innerHTML = result.html;
                const allowed = new Set([
                  "DIV",
                  "I",
                  "B",
                  "EM",
                  "STRONG",
                  "SUP",
                  "SUB",
                  "SPAN",
                ]);
                for (const element of Array.from(
                  parsed.content.querySelectorAll("*"),
                )) {
                  if (!allowed.has(element.tagName)) {
                    element.replaceWith(
                      document.createTextNode(element.textContent ?? ""),
                    );
                    continue;
                  }
                  for (const attr of Array.from(element.attributes))
                    element.removeAttribute(attr.name);
                }
                download(
                  "references.html",
                  `<!doctype html><html lang="en"><meta charset="utf-8"><title>References</title><body>${parsed.innerHTML}</body></html>`,
                  "text/html",
                );
              }}
            >
              Download formatted HTML
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

export function OCR() {
  const [language, setLanguage] = useState<"eng" | "ben">("eng");
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState<File>();
  const [text, setText] = useState("");
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const active = useRef<OcrWorker | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      void active.current?.terminate();
    };
  }, []);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function recognize() {
    if (!file) return;
    setBusy(true);
    setProgress("Loading OCR engine…");
    setText("");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let expired = false;
    try {
      const image = await createImageBitmap(file);
      const pixels = image.width * image.height;
      image.close();
      if (pixels > 20_000_000)
        throw new Error("Choose an image under 20 megapixels.");
      const { createWorker } = await import("tesseract.js");
      if (!alive.current) return;
      const base = "/api/student/ocr-assets";
      const work = createWorker(language, 1, {
        workerPath: `${base}/worker.min.js`,
        corePath: base,
        langPath: base,
        workerBlobURL: false,
        logger: (message) => {
          if (alive.current && !expired)
            setProgress(
              `${message.status} · ${Math.round(message.progress * 100)}%`,
            );
        },
        errorHandler: () => {},
      }).then(async (worker) => {
        if (!alive.current || expired) {
          await worker.terminate();
          throw new Error("OCR session closed.");
        }
        active.current = worker;
        return worker.recognize(file);
      });
      const result = await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            expired = true;
            reject(new Error("Recognition timed out. Try a smaller image."));
          }, 60000);
        }),
      ]);
      if (!alive.current) return;
      if (!result.data.text.trim())
        throw new Error(
          "No text found. Try a clearer image and check the selected language.",
        );
      setText(result.data.text);
      setProgress(
        `Recognition complete · ${Math.round(result.data.confidence)}% engine confidence`,
      );
      operation("ocr-image-to-text", true);
    } catch (error) {
      if (!alive.current) return;
      setProgress(
        error instanceof Error
          ? error.message
          : "Could not recognize this image.",
      );
      operation("ocr-image-to-text", false);
    } finally {
      clearTimeout(timer);
      await active.current?.terminate();
      active.current = null;
      if (alive.current) setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Panel title="Source image">
        <p className="mb-4 text-sm text-muted-foreground">
          Images stay on this device. Clear, printed text works best. Review the
          result for errors.
        </p>
        <label className="grid gap-2 text-sm">
          Image (JPG, PNG, or WebP, up to 10 MB)
          <input
            type="file"
            className="student-input"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              const next = event.currentTarget.files?.[0];
              setText("");
              setPreview("");
              setFile(undefined);
              setProgress("");
              if (!next) return;
              if (
                next.size > 10_000_000 ||
                !["image/jpeg", "image/png", "image/webp"].includes(next.type)
              ) {
                event.currentTarget.value = "";
                setProgress("Choose a JPG, PNG, or WebP image under 10 MB.");
                return;
              }
              setFile(next);
              setPreview(URL.createObjectURL(next));
            }}
          />
        </label>
        {preview && (
          <div className="mt-4 grid place-items-center overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              className="max-h-64 max-w-full object-contain"
              alt="Selected image preview"
            />
          </div>
        )}
        <label className="mt-4 grid gap-2 text-sm">
          Recognition language
          <select
            className="student-input"
            aria-label="Recognition language"
            value={language}
            disabled={busy}
            onChange={(event) =>
              setLanguage(event.target.value === "ben" ? "ben" : "eng")
            }
          >
            <option value="eng">English</option>
            <option value="ben">Bengali</option>
          </select>
        </label>
        <Button
          className="mt-4"
          disabled={!file || busy}
          onClick={() => void recognize()}
        >
          {busy ? "Recognizing…" : "Recognize text"}
        </Button>
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          {progress}
        </p>
      </Panel>
      <Panel title="Extracted text">
        <label className="grid gap-2 text-sm">
          Edit recognized text
          <textarea
            aria-label="Edit recognized text"
            className="student-input min-h-64"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        {text && (
          <div className="mt-3">
            <OutputActions text={text} name="recognized-text.txt" />
          </div>
        )}
      </Panel>
    </div>
  );
}

async function pdfText(file: File) {
  if (file.size > 10_000_000) throw new Error("Choose a PDF under 10 MB.");
  await validatePdf(file);
  const { getDocument, PDFWorker } = await import("pdfjs-dist");
  const port = new Worker(
    new URL("../tools/file-processing/pdfjs.worker.ts", import.meta.url),
    { type: "module" },
  );
  const worker = PDFWorker.create({ port, verbosity: 0 });
  const task = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    worker,
    useWasm: false,
    enableXfa: false,
    stopAtErrors: true,
  });
  const extract = async () => {
    const pdf = await task.promise;
    if (pdf.numPages > 50) throw new Error("Choose a PDF with up to 50 pages.");
    let text = "";
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const contents = await page.getTextContent();
      text +=
        contents.items
          .map((item) =>
            "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
          )
          .join("") + "\n";
      page.cleanup();
      if (text.length > 18000)
        return { text: text.slice(0, 18000).trim(), truncated: true };
    }
    return { text: text.trim(), truncated: false };
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      extract(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(new Error("PDF extraction timed out. Try a smaller file.")),
          30000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
    port.terminate();
    void task.destroy().catch(() => {});
    worker.destroy();
  }
}

export function Summarizer({
  configured,
  signedIn,
}: {
  configured: boolean;
  signedIn: boolean;
}) {
  const { data, save, pending } = useStudent();
  const confirm = useConfirm();
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState("concise");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("");
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Panel title="Source material">
        {!configured ? (
          <p className="mb-4 rounded-lg bg-accent p-3 text-sm" role="status">
            AI summarization is unavailable until a provider is configured. PDF
            text extraction is available.
          </p>
        ) : !signedIn ? (
          <p className="mb-4 text-sm text-muted-foreground">
            Sign in to generate summaries. PDF extraction is available to
            guests.
          </p>
        ) : null}
        <label className="grid gap-2 text-sm">
          PDF (up to 10 MB and 50 pages)
          <input
            type="file"
            className="student-input"
            accept=".pdf,application/pdf"
            disabled={busy}
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;
              setBusy(true);
              setNotice("Extracting text on this device…");
              setConsent(false);
              try {
                const extracted = await pdfText(file);
                if (!extracted.text)
                  throw new Error(
                    "No selectable text found. Scanned pages need OCR first.",
                  );
                setText(extracted.text);
                setNotice(
                  extracted.truncated
                    ? "Showing the first 18,000 characters. Edit or split the source before summarizing."
                    : "PDF text extracted.",
                );
                operation("ai-notes-summarizer", true);
              } catch (error) {
                setNotice(
                  error instanceof Error
                    ? error.message
                    : "PDF extraction failed.",
                );
                operation("ai-notes-summarizer", false);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        <label className="mt-4 grid gap-2 text-sm">
          Paste or edit notes
          <textarea
            aria-label="Paste or edit notes"
            className="student-input min-h-48"
            maxLength={18000}
            value={text}
            disabled={busy}
            onChange={(event) => {
              setText(event.target.value);
              setConsent(false);
            }}
          />
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
          {text.length.toLocaleString()} / 18,000 characters
        </p>
        {text && (
          <div className="mt-3">
            <OutputActions text={text} name="source-text.txt" />
          </div>
        )}
        {configured && signedIn && (
          <>
            <label className="mt-4 grid gap-2 text-sm">
              Summary format
              <select
                className="student-input"
                aria-label="Summary format"
                value={mode}
                disabled={busy}
                onChange={(event) => setMode(event.target.value)}
              >
                {(
                  [
                    ["concise", "Concise summary"],
                    ["detailed", "Detailed summary"],
                    ["points", "Key points"],
                    ["revision", "Revision notes"],
                    ["terms", "Important terms"],
                  ] as const
                ).map(([id, title]) => (
                  <option key={id} value={id}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
            <label className="my-4 flex items-start gap-2 text-sm">
              <input
                className="mt-1"
                type="checkbox"
                checked={consent}
                disabled={busy}
                onChange={(event) => setConsent(event.target.checked)}
              />
              I agree to send the text shown above to OpenAI for this request.
              Check the summary against your source before relying on it.
            </label>
            <Button
              disabled={busy || !consent || text.trim().length < 20}
              onClick={async () => {
                setBusy(true);
                setConsent(false);
                setNotice("Generating summary…");
                try {
                  const response = await fetch("/api/student/summary", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text, mode, consent: true }),
                  });
                  const result = await response.json();
                  if (!response.ok)
                    throw new Error(result.error ?? "Summary failed.");
                  setSummary(result.summary);
                  setSelected("");
                  setNotice("Summary ready.");
                  operation("ai-notes-summarizer", true);
                } catch (error) {
                  operation("ai-notes-summarizer", false);
                  setNotice(
                    error instanceof Error ? error.message : "Summary failed.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Generate summary
            </Button>
          </>
        )}
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          {notice}
        </p>
      </Panel>
      <Panel title="Summary and saved notes">
        {summary ? (
          <>
            <pre className="mb-4 whitespace-pre-wrap wrap-anywhere rounded-lg bg-accent p-4 font-sans text-sm">
              {summary}
            </pre>
            <OutputActions text={summary} name="study-summary.txt" />
            {signedIn && !selected && (
              <div className="mt-4">
                <Form
                  label="Save summary"
                  onSave={async (form) => {
                    const id = newId();
                    const ok = await save(
                      {
                        ...data,
                        notes: replace(data.notes, {
                          id,
                          title: get(form, "title"),
                          content: summary,
                          created: new Date().toISOString(),
                        }),
                      },
                      false,
                    );
                    if (ok) setSelected(id);
                    return ok;
                  }}
                >
                  <Field label="Summary title" name="title" />
                </Form>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Generate a summary or open one from your history.
          </p>
        )}
        {!!data.notes.length && (
          <ul className="mt-4">
            {[...data.notes]
              .sort((a, b) => b.created.localeCompare(a.created))
              .map((note) => (
                <Row
                  key={note.id}
                  title={note.title}
                  actions={
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(note.id);
                          setSummary(note.content);
                        }}
                      >
                        Open
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Delete "${note.title}"?`,
                            description: "This note will be permanently removed from your workspace.",
                            confirmText: "Delete",
                            destructive: true,
                          });
                          if (
                            ok &&
                            (await save(
                              { ...data, notes: without(data.notes, note.id) },
                              false,
                            )) &&
                            selected === note.id
                          ) {
                            setSelected("");
                            setSummary("");
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </>
                  }
                >
                  {readable(note.created, data.timezone)}
                </Row>
              ))}
          </ul>
        )}
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-medium">
            Save a note
          </summary>
          <div className="mt-3">
            <Form
              reset
              label="Save note"
              onSave={(form) =>
                save(
                  {
                    ...data,
                    notes: [
                      ...data.notes,
                      {
                        id: newId(),
                        title: get(form, "title"),
                        content: get(form, "note"),
                        created: new Date().toISOString(),
                      },
                    ],
                  },
                  false,
                )
              }
            >
              <Field label="Note title" name="title" />
              <Field label="Note text" name="note" multiline max={12000} />
            </Form>
          </div>
        </details>
      </Panel>
    </div>
  );
}
