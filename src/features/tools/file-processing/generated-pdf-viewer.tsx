"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Actions, downloadFile, Notice } from "../studios/shared";
import type { Artifact } from "./files";
import { renderPdf } from "./pdf-render";
import { useObjectUrl } from "./workspace";

export function GeneratedPdfViewer({ file }: { file: Artifact }) {
  const [page, setPage] = useState(1);
  const [zoomed, setZoomed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState<{
    page: number;
    attempt: number;
    image?: Blob;
    error?: string;
  }>();
  const [loadedImageUrl, setLoadedImageUrl] = useState<string>();
  const [openedExternally, setOpenedExternally] = useState(false);
  const source = useMemo(
    () => new File([file.blob], file.name, { type: file.blob.type }),
    [file],
  );
  const pages = file.pageCount ?? 1;
  const current =
    preview?.page === page && preview.attempt === attempt ? preview : undefined;
  const imageUrl = useObjectUrl(current?.image);
  const fallbackUrl = useObjectUrl(current?.error ? file.blob : undefined);

  useEffect(() => {
    const controller = new AbortController();
    void renderPdf(
      source,
      String(page),
      1.5,
      "image/png",
      {
        signal: controller.signal,
        progress: () => {},
      },
      1,
    )
      .then(([result]) => {
        if (!controller.signal.aborted)
          setPreview({ page, attempt, image: result.blob });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setPreview({
            page,
            attempt,
            error: "The PDF page could not be previewed here.",
          });
      });
    return () => controller.abort();
  }, [source, page, attempt]);

  return (
    <section aria-label="PDF preview" className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">PDF preview</h3>
        <span aria-live="polite" className="text-sm text-muted-foreground">
          Page {page} of {pages}
        </span>
        {imageUrl && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setZoomed(!zoomed)}
          >
            {zoomed ? "Fit to width" : "Zoom in"}
          </Button>
        )}
      </div>
      {imageUrl ? (
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-accent/40 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            onLoad={() => setLoadedImageUrl(imageUrl)}
            alt={`Preview of PDF page ${page}`}
            className={`mx-auto block h-auto bg-white shadow-sm ${zoomed ? "w-[48rem] max-w-none" : "w-full max-w-2xl"}`}
          />
        </div>
      ) : current?.error ? (
        <>
          <Notice error>{current.error}</Notice>
          <Actions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAttempt(attempt + 1)}
            >
              Retry preview
            </Button>
            {fallbackUrl && (
              <Button asChild variant="outline">
                <a
                  href={fallbackUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpenedExternally(true)}
                >
                  Open PDF in new tab
                </a>
              </Button>
            )}
          </Actions>
        </>
      ) : (
        <Notice>Loading page preview…</Notice>
      )}
      {pages > 1 && (
        <Actions>
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous page
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
          >
            Next page
          </Button>
        </Actions>
      )}
      <Button
        type="button"
        disabled={
          (!imageUrl || loadedImageUrl !== imageUrl) && !openedExternally
        }
        onClick={() => downloadFile(file.name, file.blob)}
      >
        Download {file.name}
      </Button>
    </section>
  );
}
