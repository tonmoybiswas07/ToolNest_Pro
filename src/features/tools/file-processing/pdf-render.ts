import {
  baseName,
  boundedDimensions,
  validatePdf,
  type Artifact,
  type Job,
} from "./files";
import { pageRange } from "./pdf-ranges";

export type RenderedPage = Artifact & { width: number; height: number };

export async function renderPdf(
  file: File,
  range: string,
  scale: number,
  format: "image/png" | "image/jpeg",
  job: Job,
  maxPages = 20,
  quality = 0.8,
  thumbnail = false,
) {
  const signal = AbortSignal.any([job.signal, AbortSignal.timeout(90000)]);
  function untilAbort<T>(operation: Promise<T>) {
    return new Promise<T>((resolve, reject) => {
      function abort() {
        reject(signal.reason);
      }
      if (signal.aborted) {
        operation.catch(() => {});
        abort();
        return;
      }
      signal.addEventListener("abort", abort, { once: true });
      operation
        .then(resolve, reject)
        .finally(() => signal.removeEventListener("abort", abort));
    });
  }
  await validatePdf(file);
  const { getDocument, PDFWorker, AnnotationMode } = await import("pdfjs-dist");
  signal.throwIfAborted();
  const port = new Worker(new URL("./pdfjs.worker.ts", import.meta.url), {
    type: "module",
  });
  const worker = PDFWorker.create({ port, verbosity: 0 });
  let stopRender: (() => void) | undefined;
  let abortTask: (() => void) | undefined;
  const shutdown = () => {
    stopRender?.();
    abortTask?.();
    port.terminate();
  };
  signal.addEventListener("abort", shutdown, { once: true });
  const results: RenderedPage[] = [];
  let pixels = 0;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    signal.throwIfAborted();
    const loading = getDocument({
      data,
      worker,
      enableXfa: false,
      stopAtErrors: true,
      maxImageSize: 16000000,
      canvasMaxAreaInBytes: 64000000,
      useSystemFonts: true,
      useWasm: false,
      verbosity: 0,
    });
    abortTask = () => {
      void loading.destroy().catch(() => {});
    };
    const pdf = await untilAbort(loading.promise);
    try {
      const pages = pageRange(range, pdf.numPages);
      if (pages.length > maxPages)
        throw new Error(`Choose at most ${maxPages} pages for this operation.`);
      for (const [index, number] of pages.entries()) {
        signal.throwIfAborted();
        if (!thumbnail)
          job.progress(`Rendering page ${index + 1} of ${pages.length}…`);
        const page = await untilAbort(pdf.getPage(number + 1));
        const original = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({
          scale: thumbnail
            ? Math.min(1, 150 / Math.max(original.width, original.height))
            : scale,
        });
        const width = Math.max(1, Math.ceil(viewport.width)),
          height = Math.max(1, Math.ceil(viewport.height));
        boundedDimensions(width, height, 12000000);
        pixels += width * height;
        if (pixels > 48000000)
          throw new Error(
            "Rendered pages exceed 48 megapixels. Use a lower scale or fewer pages.",
          );
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        try {
          const render = page.render({
            canvas,
            viewport,
            annotationMode: AnnotationMode.DISABLE,
            background: "#ffffff",
          });
          stopRender = () => render.cancel();
          await untilAbort(render.promise);
          signal.throwIfAborted();
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, format, quality),
          );
          if (!blob || blob.type !== format)
            throw new Error(
              "The browser could not encode the selected image format.",
            );
          results.push({
            name: `${baseName(file.name)}-page-${number + 1}.${format === "image/png" ? "png" : "jpg"}`,
            detail: `${width} × ${height} px`,
            blob,
            width: original.width,
            height: original.height,
          });
        } finally {
          canvas.width = canvas.height = 1;
          stopRender = undefined;
          page.cleanup();
        }
      }
      return results;
    } finally {
      if (!signal.aborted) await loading.destroy();
    }
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError")
      throw new Error(
        "PDF rendering exceeded 90 seconds. Try fewer pages or a lower scale.",
      );
    if (error instanceof Error && error.name === "PasswordException")
      throw new Error("Encrypted or password-protected PDFs are unsupported.");
    throw error;
  } finally {
    signal.removeEventListener("abort", shutdown);
    worker.destroy();
    port.terminate();
  }
}
