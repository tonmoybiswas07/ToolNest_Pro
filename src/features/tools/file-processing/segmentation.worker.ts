import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";
import { decode } from "./image-engine";
import { baseName, type Artifact } from "./files";

const wasm =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";
const model =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite";

self.onmessage = async ({
  data,
}: MessageEvent<{ file: File; background?: string }>) => {
  let bitmap: ImageBitmap | undefined;
  let segmenter: ImageSegmenter | undefined;
  try {
    if (
      typeof OffscreenCanvas === "undefined" ||
      typeof WebAssembly === "undefined"
    ) {
      throw new Error(
        "Background removal requires WebAssembly and OffscreenCanvas.",
      );
    }
    bitmap = await decode(data.file);
    const { width, height } = bitmap;
    if (width * height > 8000000)
      throw new Error(
        "Resize this image to 8 megapixels or less before removing its background.",
      );
    self.postMessage({
      progress: "Loading the person-segmentation model and runtime…",
    });
    try {
      const files = await FilesetResolver.forVisionTasks(wasm);
      segmenter = await ImageSegmenter.createFromOptions(files, {
        baseOptions: { modelAssetPath: model, delegate: "CPU" },
        canvas: new OffscreenCanvas(1, 1),
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
    } catch {
      throw new Error(
        "The segmentation model could not load. Check your connection and browser graphics support, then try again.",
      );
    }
    self.postMessage({
      progress: "Segmenting the foreground and encoding PNG…",
    });
    const thumbScale = Math.min(1, 512 / Math.max(width, height));
    const thumb = new OffscreenCanvas(
      Math.max(1, Math.round(width * thumbScale)),
      Math.max(1, Math.round(height * thumbScale)),
    );
    const thumbCtx = thumb.getContext("2d");
    if (!thumbCtx)
      throw new Error("The browser could not allocate a model input canvas.");
    thumbCtx.drawImage(bitmap, 0, 0, thumb.width, thumb.height);
    const result = segmenter.segment(thumb);
    try {
      const mask = result.confidenceMasks?.at(-1);
      if (!mask) throw new Error("The model did not return a foreground mask.");
      const confidence = mask.getAsFloat32Array();
      const maskCanvas = new OffscreenCanvas(mask.width, mask.height);
      const maskCtx = maskCanvas.getContext("2d");
      const output = new OffscreenCanvas(width, height);
      const ctx = output.getContext("2d");
      if (!maskCtx || !ctx)
        throw new Error("The browser could not allocate the result canvas.");
      const alpha = maskCtx.createImageData(mask.width, mask.height);
      for (let i = 0; i < confidence.length; i++)
        alpha.data[i * 4 + 3] = Math.round(
          255 * Math.max(0, Math.min(1, (confidence[i] - 0.15) / 0.7)),
        );
      maskCtx.putImageData(alpha, 0, 0);
      ctx.drawImage(bitmap, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(maskCanvas, 0, 0, width, height);
      if (data.background) {
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = data.background;
        ctx.fillRect(0, 0, width, height);
      }
      const blob = await output.convertToBlob({ type: "image/png" });
      const artifact: Artifact = {
        name: `${baseName(data.file.name)}-foreground.png`,
        blob,
        detail: `${width} × ${height} px`,
      };
      self.postMessage({ result: artifact });
    } finally {
      result.close();
    }
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Segmentation failed.",
    });
  } finally {
    segmenter?.close();
    bitmap?.close();
  }
};
