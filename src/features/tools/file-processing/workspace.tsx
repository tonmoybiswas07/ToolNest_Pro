"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Actions,
  downloadFile,
  Notice,
  Panel,
  trackOperation,
} from "../studios/shared";
import { fileSize, makeZip, MiB, type Artifact, type Job } from "./files";

export function useFileJob(slug: string) {
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [output, setOutput] = useState<Artifact[]>([]);
  const cancel = () => active.current?.abort();

  useEffect(() => () => active.current?.abort(), []);

  async function run(operation: (job: Job) => Promise<Artifact[]>) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    const { signal } = controller;
    setBusy(true);
    setProgress("Preparing files…");
    setOutput([]);
    setError("");
    try {
      const files = await operation({
        signal,
        progress: (message) => {
          if (!signal.aborted) setProgress(message);
        },
      });
      signal.throwIfAborted();
      if (!files.length || files.some((file) => !file.blob.size))
        throw new Error("Processing produced no valid output.");
      setOutput(files);
      trackOperation(slug, true);
    } catch (cause) {
      if (!signal.aborted) {
        setError(
          cause instanceof Error
            ? cause.message
            : "The files could not be processed.",
        );
        trackOperation(slug, false);
      }
    } finally {
      active.current = null;
      setBusy(false);
      setProgress("");
    }
  }

  return {
    run,
    cancel,
    busy,
    progress,
    output,
    error,
    clear: () => {
      cancel();
      setOutput([]);
      setError("");
    },
  };
}

export function useObjectUrl(blob: Blob | undefined) {
  const [resource, setResource] = useState<{ blob: Blob; url: string }>();
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const timer = window.setTimeout(() => setResource({ blob, url }), 0);
    return () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
    };
  }, [blob]);
  return resource?.blob === blob ? resource?.url : undefined;
}

export function FilePreview({
  blob,
  label,
  children,
}: {
  blob: Blob;
  label: string;
  children?: ReactNode;
}) {
  const url = useObjectUrl(blob);
  if (!url) return null;
  return (
    <figure className="min-w-0 space-y-2">
      <figcaption className="text-sm text-muted-foreground">{label}</figcaption>
      <div className="relative flex min-h-20 justify-center overflow-hidden rounded-xl border border-border bg-[repeating-conic-gradient(var(--accent)_0%_25%,var(--background)_0%_50%)] bg-size-[20px_20px]">
        <div className="relative max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            loading="lazy"
            decoding="async"
            className="block max-h-72 max-w-full object-contain"
          />
          {children}
        </div>
      </div>
    </figure>
  );
}

export function FileDropzone({
  label,
  accept,
  multiple = false,
  max = 1,
  fileMiB,
  totalMiB = fileMiB,
  disabled,
  acceptFiles,
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  max?: number;
  fileMiB: number;
  totalMiB?: number;
  disabled?: boolean;
  acceptFiles: (files: File[]) => void;
}) {
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  function receive(files: File[]) {
    if (!files.length || disabled) return;
    if (
      files.length > max ||
      files.some((file) => !file.size || file.size > fileMiB * MiB) ||
      files.reduce((size, file) => size + file.size, 0) > totalMiB * MiB
    ) {
      setError(
        `Choose up to ${max} non-empty files, up to ${fileMiB} MB each and ${totalMiB} MB total.`,
      );
      return;
    }
    setError("");
    acceptFiles(files);
  }
  return (
    <div className="space-y-2">
      <label
        className={`grid cursor-pointer justify-items-center gap-2 rounded-xl border border-dashed p-5 text-center ${drag ? "border-highlight bg-accent" : "border-input bg-background"}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDrag(false);
          receive(Array.from(event.dataTransfer.files));
        }}
      >
        <UploadCloud size={22} aria-hidden />
        <span className="font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          Drop files here or browse. Up to {max} {max === 1 ? "file" : "files"},{" "}
          {fileMiB} MB per file{multiple ? ` and ${totalMiB} MB total` : ""}.
        </span>
        <input
          type="file"
          aria-label={label}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="max-w-full text-sm"
          onChange={(event) => {
            receive(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </label>
      {error && <Notice error>{error}</Notice>}
    </div>
  );
}

export function FileOrder({
  rows,
  setRows,
  disabled,
}: {
  rows: File[];
  setRows: (files: File[]) => void;
  disabled?: boolean;
}) {
  function shift(from: number, to: number) {
    const next = [...rows];
    next.splice(to, 0, ...next.splice(from, 1));
    setRows(next);
  }
  return (
    <ol className="grid gap-2">
      {rows.map((file, index) => (
        <li
          key={`${file.name}-${index}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2"
        >
          <span className="min-w-0 wrap-break-word text-sm">
            {index + 1}. {file.name} · {fileSize(file.size)}
          </span>
          <Actions>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || index === 0}
              aria-label={`Move file ${index + 1} up`}
              onClick={() => shift(index, index - 1)}
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || index === rows.length - 1}
              aria-label={`Move file ${index + 1} down`}
              onClick={() => shift(index, index + 1)}
            >
              ↓
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={() => setRows(rows.filter((_, i) => i !== index))}
            >
              Remove {index + 1}
            </Button>
          </Actions>
        </li>
      ))}
    </ol>
  );
}

function SizeChange({ before, after }: { before: number; after: number }) {
  const percentage = (Math.abs(after - before) * 100) / before;
  return (
    <Notice>
      {fileSize(before)} → {fileSize(after)} ·{" "}
      {after === before
        ? "same size"
        : `${percentage.toFixed(1)}% ${after < before ? "smaller" : "larger"}`}
    </Notice>
  );
}

export function Results({
  job,
  empty = "Processed files will appear here.",
}: {
  job: ReturnType<typeof useFileJob>;
  empty?: string;
}) {
  const [zipBusy, setZipBusy] = useState(false);
  const [zipError, setZipError] = useState("");
  async function zip() {
    setZipBusy(true);
    setZipError("");
    try {
      downloadFile("toolnest-results.zip", await makeZip(job.output));
    } catch (error) {
      setZipError(
        error instanceof Error
          ? error.message
          : "Could not create the ZIP archive.",
      );
    } finally {
      setZipBusy(false);
    }
  }
  return (
    <Panel title="Results">
      {job.busy && (
        <div className="space-y-3">
          <Notice>{job.progress}</Notice>
          <Button type="button" variant="outline" onClick={job.cancel}>
            Cancel processing
          </Button>
        </div>
      )}
      {job.error && <Notice error>{job.error}</Notice>}
      {!job.busy && !job.error && !job.output.length && (
        <Notice>{empty}</Notice>
      )}
      {job.output.length > 1 && (
        <Button
          type="button"
          variant="outline"
          disabled={zipBusy}
          onClick={() => void zip()}
        >
          {zipBusy ? "Creating ZIP…" : "Download all as ZIP"}
        </Button>
      )}
      {zipError && <Notice error>{zipError}</Notice>}
      {job.output.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          className="grid gap-3 rounded-xl border border-border p-3"
        >
          <p className="wrap-break-word font-medium">{file.name}</p>
          {file.detail && <Notice>{file.detail}</Notice>}
          {file.originalBytes ? (
            <SizeChange before={file.originalBytes} after={file.blob.size} />
          ) : (
            <Notice>{fileSize(file.blob.size)}</Notice>
          )}
          {file.blob.type.startsWith("image/") && (
            <div
              className={`grid gap-2 ${file.source ? "sm:grid-cols-2" : ""}`}
            >
              {file.source && (
                <FilePreview blob={file.source} label="Original image" />
              )}
              <FilePreview blob={file.blob} label="Processed image" />
            </div>
          )}
          <Button
            type="button"
            className="justify-self-start"
            onClick={() => downloadFile(file.name, file.blob)}
          >
            Download {file.name}
          </Button>
        </div>
      ))}
    </Panel>
  );
}

export function FileWorkspace({
  children,
  job,
  notice,
}: {
  children: ReactNode;
  job: ReturnType<typeof useFileJob>;
  notice: string;
}) {
  return (
    <div className="mt-8 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 [&_fieldset]:min-w-0 [&_select]:w-full [&_select]:min-w-0">
      <Panel title="File workspace">
        <Notice>{notice} Files are processed in this browser.</Notice>
        {children}
      </Panel>
      <Results job={job} />
    </div>
  );
}
