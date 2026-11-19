"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Actions,
  Field,
  Notice,
  selectClass,
  type StudioProps,
} from "../studios/shared";
import { Slider } from "../studios/design-controls";
import { acceptImages } from "./image-controls";
import { inspectImage, type Artifact, type Job } from "./files";
import type { Metadata, PageEdit, PdfCommand, Watermark } from "./pdf-engine";
import { renderPdf } from "./pdf-render";
import {
  FileDropzone,
  FileOrder,
  FilePreview,
  FileWorkspace,
  useFileJob,
} from "./workspace";
import { workerJob } from "./worker-job";

const pdfAccept = "application/pdf,.pdf";
const pdfLimit = "PDF files only. Up to 30 MB per file and 500 pages.";
const watermarkDefault: Watermark = {
  text: "",
  opacity: 0.3,
  position: "center",
};
const metadataFields = ["title", "author", "subject", "keywords"] as const;
type PdfInfo = Metadata & { count: number };

function pdfJob<T>(command: PdfCommand, job: Job) {
  const worker = new Worker(
    new URL("./pdf-operations.worker.ts", import.meta.url),
    { type: "module" },
  );
  return workerJob<T>(worker, command, job.signal, 90000, job.progress);
}

function usePdfFiles(clear: () => void) {
  const [rows, setRows] = useState<{ file: File; info: PdfInfo }[]>([]);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const active = useRef<AbortController>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function select(files: File[]) {
    clear();
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setChecking(true);
    setError("");
    setRows([]);
    try {
      const info = await pdfJob<PdfInfo[]>(
        { type: "inspect", files },
        { signal: controller.signal, progress: () => {} },
      );
      if (!controller.signal.aborted)
        setRows(files.map((file, index) => ({ file, info: info[index] })));
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Invalid PDF.");
    } finally {
      if (!controller.signal.aborted) setChecking(false);
    }
  }
  return {
    rows,
    setRows,
    error,
    checking,
    select,
    reset: () => {
      active.current?.abort();
      setRows([]);
      setError("");
      setChecking(false);
      clear();
    },
  };
}

function PdfPicker({
  source,
  multiple = false,
  busy,
}: {
  source: ReturnType<typeof usePdfFiles>;
  multiple?: boolean;
  busy: boolean;
}) {
  return (
    <>
      <FileDropzone
        label={multiple ? "Choose PDF documents" : "Choose a PDF"}
        accept={pdfAccept}
        multiple={multiple}
        max={multiple ? 12 : 1}
        fileMiB={30}
        totalMiB={60}
        disabled={busy || source.checking}
        acceptFiles={(files) => void source.select(files)}
      />
      {source.checking && (
        <Notice>Reading PDF structure and page counts…</Notice>
      )}
      {source.error && <Notice error>{source.error}</Notice>}
      {source.rows.length > 0 && (
        <ul className="grid gap-2 text-sm">
          {source.rows.map((row, index) => (
            <li key={index} className="wrap-break-word">
              {row.file.name} · {row.info.count}{" "}
              {row.info.count === 1 ? "page" : "pages"}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Thumbnails({
  file,
  count,
  page,
}: {
  file: File;
  count: number;
  page?: number;
}) {
  const [state, setState] = useState<{
    file: File;
    page?: number;
    files?: Artifact[];
    error?: string;
  }>();
  useEffect(() => {
    const controller = new AbortController();
    const range = page ? String(page) : `1-${Math.min(count, 6)}`;
    const timer = window.setTimeout(async () => {
      try {
        const files = await renderPdf(
          file,
          range,
          1,
          "image/png",
          { signal: controller.signal, progress: () => {} },
          6,
          0.8,
          true,
        );
        if (!controller.signal.aborted) setState({ file, page, files });
      } catch (cause) {
        if (!controller.signal.aborted)
          setState({
            file,
            page,
            error:
              cause instanceof Error
                ? cause.message
                : "Thumbnails unavailable.",
          });
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [count, file, page]);
  const current =
    state?.file === file && state?.page === page ? state : undefined;
  if (current?.error) return <Notice error>{current.error}</Notice>;
  if (!current?.files) return <Notice>Rendering preview…</Notice>;
  return (
    <div
      className={page ? "max-w-40" : "grid grid-cols-2 gap-2 sm:grid-cols-3"}
    >
      {current.files.map((item, index) => (
        <FilePreview
          key={item.name}
          blob={item.blob}
          label={`Page ${page ?? index + 1}`}
        />
      ))}
    </div>
  );
}

function Merge({ slug }: StudioProps) {
  const job = useFileJob(slug);
  const source = usePdfFiles(job.clear);
  return (
    <FileWorkspace job={job} notice={pdfLimit}>
      <PdfPicker source={source} multiple busy={job.busy} />
      {source.rows.length > 0 && (
        <FileOrder
          rows={source.rows.map((row) => row.file)}
          disabled={job.busy}
          setRows={(files) => {
            source.setRows(
              files.flatMap(
                (file) => source.rows.find((row) => row.file === file) ?? [],
              ),
            );
            job.clear();
          }}
        />
      )}
      <Notice>
        Documents are merged in the displayed order. Interactive form fields and
        document-level features may not carry over.
      </Notice>
      <Actions>
        <Button
          type="button"
          disabled={job.busy || source.checking || source.rows.length < 2}
          onClick={() =>
            void job.run((context) =>
              pdfJob<Artifact[]>(
                { type: "merge", files: source.rows.map((row) => row.file) },
                context,
              ),
            )
          }
        >
          Merge PDFs
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={job.busy}
          onClick={source.reset}
        >
          Reset
        </Button>
      </Actions>
    </FileWorkspace>
  );
}

function SingleOperation({ slug }: StudioProps) {
  const split = slug === "pdf-splitter";
  const job = useFileJob(slug);
  const source = usePdfFiles(job.clear);
  const row = source.rows[0];
  const [range, setRange] = useState("");
  const [separate, setSeparate] = useState(false);
  const [raster, setRaster] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [quality, setQuality] = useState(65);
  const [preview, setPreview] = useState(false);

  return (
    <FileWorkspace job={job} notice={pdfLimit}>
      <PdfPicker source={source} busy={job.busy} />
      <fieldset disabled={job.busy || source.checking} className="space-y-3">
        {split ? (
          <>
            <Field label="Pages to extract">
              <Input
                value={range}
                maxLength={1800}
                placeholder="1-3, 5, 7-10"
                onChange={(event) => setRange(event.target.value)}
              />
            </Field>
            <Notice>
              Leave empty to select every page. Pages follow the order entered.
              Duplicate selections are rejected.
            </Notice>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={separate}
                onChange={(event) => setSeparate(event.target.checked)}
              />{" "}
              One PDF per selected page (up to 40)
            </label>
            {row && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreview(!preview)}
              >
                {preview ? "Hide page previews" : "Preview first pages"}
              </Button>
            )}
            {row && preview && (
              <Thumbnails file={row.file} count={row.info.count} />
            )}
          </>
        ) : (
          <>
            <Field label="Compression mode">
              <select
                className={selectClass}
                value={raster ? "raster" : "structural"}
                onChange={(event) => {
                  setRaster(event.target.value === "raster");
                  setConfirmed(false);
                }}
              >
                <option value="structural">
                  Repack PDF objects (no rasterization)
                </option>
                <option value="raster">Rasterize pages to JPEG (lossy)</option>
              </select>
            </Field>
            <Notice>
              {raster
                ? "Rasterization replaces each page with an image. It can remove searchable text, vectors, forms, annotations, links, signatures, and accessibility information."
                : "Repacking compresses compatible PDF structures and keeps text and vectors. Existing image streams are left as-is. The output can be the same size or larger."}
            </Notice>
            {raster && (
              <>
                <Slider
                  label="JPEG quality"
                  value={quality}
                  min={20}
                  max={95}
                  unit="%"
                  change={setQuality}
                />
                <label className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />{" "}
                  I want an image-only PDF (up to 20 pages)
                </label>
              </>
            )}
          </>
        )}
        <Actions>
          <Button
            type="button"
            disabled={!row || (!split && raster && !confirmed)}
            onClick={() => {
              if (!row) return;
              void job.run(async (context) => {
                if (split)
                  return pdfJob<Artifact[]>(
                    { type: "split", file: row.file, range, separate },
                    context,
                  );
                if (!raster)
                  return pdfJob<Artifact[]>(
                    { type: "optimize", file: row.file },
                    context,
                  );
                const images = await renderPdf(
                  row.file,
                  "",
                  1.2,
                  "image/jpeg",
                  context,
                  20,
                  quality / 100,
                );
                return pdfJob<Artifact[]>(
                  { type: "raster", file: row.file, images },
                  context,
                );
              });
            }}
          >
            {split ? "Extract pages" : "Process PDF"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              source.reset();
              setRange("");
              setSeparate(false);
              setRaster(false);
              setConfirmed(false);
              setQuality(65);
              setPreview(false);
            }}
          >
            Reset
          </Button>
        </Actions>
      </fieldset>
    </FileWorkspace>
  );
}

function PdfToImage({ slug }: StudioProps) {
  const job = useFileJob(slug);
  const source = usePdfFiles(job.clear);
  const row = source.rows[0];
  const [range, setRange] = useState("");
  const [format, setFormat] = useState<"image/png" | "image/jpeg">("image/png");
  const [scale, setScale] = useState(1.5);
  return (
    <FileWorkspace job={job} notice={pdfLimit}>
      <PdfPicker source={source} busy={job.busy} />
      <fieldset disabled={job.busy || source.checking} className="space-y-3">
        <Field label="Pages to render">
          <Input
            value={range}
            maxLength={1800}
            placeholder="1-3, 5"
            onChange={(event) => setRange(event.target.value)}
          />
        </Field>
        <Field label="Image format">
          <select
            className={selectClass}
            value={format}
            onChange={(event) => setFormat(event.target.value as typeof format)}
          >
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPG</option>
          </select>
        </Field>
        <Field label="Rendering scale">
          <select
            className={selectClass}
            value={scale}
            onChange={(event) => setScale(Number(event.target.value))}
          >
            <option value={1}>1× (72 DPI)</option>
            <option value={1.5}>1.5× (108 DPI)</option>
            <option value={2}>2× (144 DPI)</option>
            <option value={3}>3× (216 DPI)</option>
          </select>
        </Field>
        <Notice>
          Up to 20 pages per batch, 12 megapixels per page and 48 megapixels
          total. Interactive annotations are omitted.
        </Notice>
        <Actions>
          <Button
            type="button"
            disabled={!row}
            onClick={() => {
              if (row)
                void job.run((context) =>
                  renderPdf(row.file, range, scale, format, context),
                );
            }}
          >
            Render pages
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              source.reset();
              setRange("");
              setFormat("image/png");
              setScale(1.5);
            }}
          >
            Reset
          </Button>
        </Actions>
      </fieldset>
    </FileWorkspace>
  );
}

function ImagesToPdf({ slug }: StudioProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [pageSize, setPageSize] = useState<"A4" | "Letter">("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait",
  );
  const [margin, setMargin] = useState("24");
  const job = useFileJob(slug);
  return (
    <FileWorkspace
      job={job}
      notice="JPG, PNG or WebP. Each image is fit to one page without stretching."
    >
      <FileDropzone
        label="Choose images"
        accept={acceptImages}
        multiple
        max={12}
        fileMiB={20}
        totalMiB={60}
        disabled={job.busy || checking}
        acceptFiles={async (next) => {
          job.clear();
          setChecking(true);
          setError("");
          try {
            await Promise.all(next.map(inspectImage));
            setFiles(next);
          } catch (cause) {
            setFiles([]);
            setError(cause instanceof Error ? cause.message : "Invalid image.");
          } finally {
            setChecking(false);
          }
        }}
      />
      {error && <Notice error>{error}</Notice>}
      {files.length > 0 && (
        <FileOrder
          rows={files}
          setRows={(next) => {
            setFiles(next);
            job.clear();
          }}
          disabled={job.busy || checking}
        />
      )}
      <fieldset disabled={job.busy || checking} className="space-y-3">
        <Field label="Page size">
          <select
            className={selectClass}
            value={pageSize}
            onChange={(event) =>
              setPageSize(event.target.value as typeof pageSize)
            }
          >
            <option>A4</option>
            <option>Letter</option>
          </select>
        </Field>
        <Field label="Page orientation">
          <select
            className={selectClass}
            value={orientation}
            onChange={(event) =>
              setOrientation(event.target.value as typeof orientation)
            }
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </Field>
        <Field label="Margin (points)">
          <Input
            type="number"
            min={0}
            max={144}
            value={margin}
            onChange={(event) => setMargin(event.target.value)}
          />
        </Field>
        <Actions>
          <Button
            type="button"
            disabled={!files.length}
            onClick={() =>
              void job.run((context) =>
                pdfJob<Artifact[]>(
                  {
                    type: "images",
                    files,
                    pageSize,
                    orientation,
                    margin: Number(margin),
                  },
                  context,
                ),
              )
            }
          >
            Generate PDF
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setFiles([]);
              setError("");
              setPageSize("A4");
              setOrientation("portrait");
              setMargin("24");
              job.clear();
            }}
          >
            Reset
          </Button>
        </Actions>
      </fieldset>
    </FileWorkspace>
  );
}

function PageEditor({
  slug,
  file,
  info,
  reset,
}: StudioProps & { file: File; info: PdfInfo; reset: () => void }) {
  const [pages, setPages] = useState<PageEdit[]>(() =>
    Array.from({ length: info.count }, (_, p) => ({ p, rotate: 0 })),
  );
  const [past, setPast] = useState<PageEdit[][]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [watermark, setWatermark] = useState(watermarkDefault);
  const [metadata, setMetadata] = useState<Metadata>(info);
  const [preview, setPreview] = useState<number>();
  const [offset, setOffset] = useState(0);
  const job = useFileJob(slug);
  const pageWindow = pages.slice(offset, offset + 20);
  const visibleOffset = pageWindow.length ? offset : 0;

  function edit(next: PageEdit[]) {
    setPast([...past, pages].slice(-30));
    setPages(next);
    job.clear();
    if (offset >= next.length)
      setOffset(Math.max(0, Math.floor((next.length - 1) / 20) * 20));
  }
  function move(from: number, to: number) {
    const next = [...pages];
    next.splice(to, 0, ...next.splice(from, 1));
    edit(next);
  }
  function generate(extract: boolean) {
    void job.run((context) =>
      pdfJob<Artifact[]>(
        {
          type: "toolkit",
          file,
          pages: extract
            ? pages.filter((page) => selected.includes(page.p))
            : pages,
          metadata,
          watermark,
          extract,
        },
        context,
      ),
    );
  }

  return (
    <FileWorkspace job={job} notice="Edit, reorder, or extract PDF pages.">
      <Notice>
        Editing can invalidate digital signatures. Extraction may change forms,
        annotations, bookmarks, and links. Watermarks support Western Latin
        text.
      </Notice>
      <fieldset className="space-y-4" disabled={job.busy}>
        <div className="flex flex-wrap items-center gap-2">
          <Notice>
            {pages.length} remaining pages ·{" "}
            {selected.filter((p) => pages.some((page) => page.p === p)).length}{" "}
            selected
          </Notice>
          <Button
            type="button"
            variant="outline"
            disabled={visibleOffset < 20}
            onClick={() => setOffset(visibleOffset - 20)}
          >
            Previous 20 pages
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={visibleOffset + 20 >= pages.length}
            onClick={() => setOffset(visibleOffset + 20)}
          >
            Next 20 pages
          </Button>
        </div>
        <ol start={visibleOffset + 1} className="space-y-2">
          {(pageWindow.length ? pageWindow : pages.slice(0, 20)).map(
            (page, index) => {
              const position = visibleOffset + index;
              return (
                <li
                  key={page.p}
                  className="space-y-2 rounded-lg border border-border p-2"
                >
                  <label className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(page.p)}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? [...selected, page.p]
                            : selected.filter((id) => id !== page.p),
                        )
                      }
                    />
                    {position + 1}. Original page {page.p + 1}{" "}
                    {page.rotate ? `· Rotate +${page.rotate}°` : ""}
                  </label>
                  <Actions>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={position === 0}
                      aria-label={`Move page ${page.p + 1} up`}
                      onClick={() => move(position, position - 1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={position === pages.length - 1}
                      aria-label={`Move page ${page.p + 1} down`}
                      onClick={() => move(position, position + 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        edit(
                          pages.map((item) =>
                            item.p === page.p
                              ? { ...item, rotate: (item.rotate + 90) % 360 }
                              : item,
                          ),
                        )
                      }
                    >
                      Rotate {page.p + 1}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setPreview(preview === page.p ? undefined : page.p)
                      }
                    >
                      Preview {page.p + 1}
                    </Button>
                  </Actions>
                  {preview === page.p && (
                    <Thumbnails
                      file={file}
                      count={info.count}
                      page={page.p + 1}
                    />
                  )}
                </li>
              );
            },
          )}
        </ol>
        <Actions>
          <Button
            type="button"
            variant="outline"
            disabled={
              !pages.some((page) => selected.includes(page.p)) ||
              pages.every((page) => selected.includes(page.p))
            }
            onClick={() => {
              edit(pages.filter((page) => !selected.includes(page.p)));
              setSelected([]);
            }}
          >
            Delete selected pages
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!past.length}
            onClick={() => {
              setPages(past.at(-1) ?? pages);
              setPast(past.slice(0, -1));
              setSelected([]);
              job.clear();
            }}
          >
            Undo page change
          </Button>
        </Actions>
        <Field label="Watermark text">
          <Input
            value={watermark.text}
            maxLength={100}
            onChange={(event) =>
              setWatermark({ ...watermark, text: event.target.value })
            }
          />
        </Field>
        <Slider
          label="Watermark opacity"
          value={Math.round(watermark.opacity * 100)}
          unit="%"
          change={(value) =>
            setWatermark({ ...watermark, opacity: value / 100 })
          }
        />
        <Field label="Watermark position">
          <select
            className={selectClass}
            value={watermark.position}
            onChange={(event) =>
              setWatermark({
                ...watermark,
                position: event.target.value as Watermark["position"],
              })
            }
          >
            <option value="top">Top</option>
            <option value="center">Center</option>
            <option value="bottom">Bottom</option>
          </select>
        </Field>
        <details className="space-y-2">
          <summary className="cursor-pointer font-medium">
            Document metadata
          </summary>
          {metadataFields.map((key) => (
            <Field key={key} label={key[0].toUpperCase() + key.slice(1)}>
              <Input
                value={metadata[key] ?? ""}
                maxLength={200}
                onChange={(event) =>
                  setMetadata({ ...metadata, [key]: event.target.value })
                }
              />
            </Field>
          ))}
        </details>
        <Actions>
          <Button type="button" onClick={() => generate(false)}>
            Process PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!pages.some((page) => selected.includes(page.p))}
            onClick={() => generate(true)}
          >
            Extract selected pages
          </Button>
          <Button type="button" variant="ghost" onClick={reset}>
            Reset
          </Button>
        </Actions>
      </fieldset>
    </FileWorkspace>
  );
}

function EditPdf({ slug }: StudioProps) {
  const job = useFileJob(slug);
  const source = usePdfFiles(job.clear);
  const row = source.rows[0];
  if (row)
    return (
      <PageEditor
        slug={slug}
        file={row.file}
        info={row.info}
        reset={source.reset}
      />
    );
  return (
    <FileWorkspace job={job} notice={pdfLimit}>
      <PdfPicker source={source} busy={false} />
    </FileWorkspace>
  );
}

function Toolkit(props: StudioProps) {
  const params = useSearchParams();
  const requested = params.get("mode");
  const mode =
    requested === "pdf-to-image" || requested === "image-to-pdf"
      ? requested
      : "edit";
  return (
    <>
      <div
        role="group"
        aria-label="PDF Toolkit mode"
        className="mt-6 flex flex-wrap gap-2"
      >
        {(
          [
            ["edit", "Edit PDF"],
            ["pdf-to-image", "PDF to Image"],
            ["image-to-pdf", "Image to PDF"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            aria-pressed={mode === id}
            variant={mode === id ? "default" : "outline"}
            onClick={() => {
              const url = new URL(window.location.href);
              if (id === "edit") url.searchParams.delete("mode");
              else url.searchParams.set("mode", id);
              window.history.pushState(null, "", url);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {mode === "pdf-to-image" ? (
        <PdfToImage {...props} />
      ) : mode === "image-to-pdf" ? (
        <ImagesToPdf {...props} />
      ) : (
        <EditPdf {...props} />
      )}
    </>
  );
}

export default function PdfWorkspaces(props: StudioProps) {
  if (props.slug === "pdf-merger") return <Merge {...props} />;
  if (props.slug === "pdf-toolkit") return <Toolkit {...props} />;
  return <SingleOperation {...props} />;
}
