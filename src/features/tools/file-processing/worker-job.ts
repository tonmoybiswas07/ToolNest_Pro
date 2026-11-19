export function workerJob<T>(
  worker: Worker,
  payload: unknown,
  signal: AbortSignal,
  timeout = 60000,
  progress?: (message: string) => void,
) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        finish(
          undefined,
          new Error("Processing exceeded the time limit. Try a smaller file."),
        ),
      timeout,
    );
    function abort() {
      finish(undefined, new DOMException("Cancelled", "AbortError"));
    }
    function finish(value?: T, error?: Error) {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      worker.terminate();
      if (error) reject(error);
      else resolve(value as T);
    }
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    worker.onmessage = ({
      data,
    }: MessageEvent<{ result?: T; error?: string; progress?: string }>) => {
      if (data.progress) {
        progress?.(data.progress);
        return;
      }
      if (data.error || data.result === undefined)
        finish(
          undefined,
          new Error(data.error ?? "The worker returned no result."),
        );
      else finish(data.result);
    };
    worker.onerror = () =>
      finish(
        undefined,
        new Error("The processing worker could not run in this browser."),
      );
    try {
      worker.postMessage(payload);
    } catch {
      finish(
        undefined,
        new Error("The file could not be sent to the local processing worker."),
      );
    }
  });
}
