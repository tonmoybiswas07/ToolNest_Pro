import type { Job } from "./files";
import type { PdfCommand } from "./pdf-engine";
import { workerJob } from "./worker-job";

export function pdfJob<T>(command: PdfCommand, job: Job) {
  const worker = new Worker(
    new URL("./pdf-operations.worker.ts", import.meta.url),
    { type: "module" },
  );
  return workerJob<T>(worker, command, job.signal, 90000, job.progress);
}
