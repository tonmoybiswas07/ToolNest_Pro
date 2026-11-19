import { processImage, type ImageOptions } from "./image-engine";

self.onmessage = async ({
  data,
}: MessageEvent<{ file: File; options: ImageOptions }>) => {
  try {
    self.postMessage({ result: await processImage(data.file, data.options) });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "Image processing failed.",
    });
  }
};
