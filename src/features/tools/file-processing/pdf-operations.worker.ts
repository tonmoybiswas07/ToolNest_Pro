import { pdfCommand, type PdfCommand } from "./pdf-engine";

self.onmessage = async ({ data }: MessageEvent<PdfCommand>) => {
  try {
    self.postMessage({
      result: await pdfCommand(data, (progress) =>
        self.postMessage({ progress }),
      ),
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "PDF operation failed.",
    });
  }
};
