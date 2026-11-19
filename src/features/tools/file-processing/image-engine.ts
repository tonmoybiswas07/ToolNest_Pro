import {
  baseName,
  boundedDimensions,
  imageExtension,
  inspectImage,
  type Artifact,
  type ImageFormat,
} from "./files";

export type Crop = { x: number; y: number; width: number; height: number };
export const fullCrop: Crop = { x: 0, y: 0, width: 100, height: 100 };
export type Overlay = {
  text: string;
  size: number;
  color: string;
  align: "left" | "center" | "right";
  mark?: File;
  markSize: number;
};
export type ImageOptions = {
  format: ImageFormat | "original";
  quality: number;
  background: string;
  crop?: Crop;
  width?: number;
  height?: number;
  rotate?: number;
  flipX?: boolean;
  flipY?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  grayscale?: boolean;
  blur?: number;
  fit?: "cover" | "contain";
  padding?: number;
  positionX?: number;
  positionY?: number;
  overlay?: Overlay;
};

export const defaultImageOptions: ImageOptions = {
  format: "image/png",
  quality: 0.82,
  background: "#ffffff",
};

export function cropPixels(
  width: number,
  height: number,
  crop: Crop = fullCrop,
) {
  const x = Math.min(width - 1, Math.round((width * crop.x) / 100));
  const y = Math.min(height - 1, Math.round((height * crop.y) / 100));
  const w = Math.min(
    width - x,
    Math.max(1, Math.round((width * crop.width) / 100)),
  );
  const h = Math.min(
    height - y,
    Math.max(1, Math.round((height * crop.height) / 100)),
  );
  boundedDimensions(w, h);
  return { x, y, w, h };
}

export function fitRect(
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
  mode: "cover" | "contain",
  x = 50,
  y = 50,
) {
  const scale = Math[mode === "cover" ? "max" : "min"](
    width / sourceWidth,
    height / sourceHeight,
  );
  const w = sourceWidth * scale,
    h = sourceHeight * scale;
  return {
    x: ((width - w) * x) / 100,
    y: ((height - h) * y) / 100,
    width: w,
    height: h,
  };
}

export async function decode(file: Blob) {
  await inspectImage(file);
  if (typeof createImageBitmap !== "function")
    throw new Error("This browser does not support local image decoding.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("The image decoder could not open this file.");
  }
  try {
    boundedDimensions(bitmap.width, bitmap.height);
    return bitmap;
  } catch (error) {
    bitmap.close();
    throw error;
  }
}

function drawCaption(
  ctx: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  overlay: Overlay,
) {
  if (!overlay.text.trim()) return;
  const margin = Math.max(8, Math.round(Math.min(width, height) * 0.05));
  const maxWidth = width - 2 * margin;
  if (maxWidth < 1)
    throw new Error("Use a larger canvas for the text overlay.");
  const size = Math.min(overlay.size, Math.max(1, Math.floor(height / 4)));
  ctx.font = `600 ${size}px sans-serif`;
  ctx.textAlign = overlay.align;
  ctx.textBaseline = "bottom";
  ctx.fillStyle = overlay.color;
  const lines: string[] = [];
  for (const paragraph of overlay.text.split("\n")) {
    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      const line = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(line).width > maxWidth) {
        lines.push(current);
        current = word;
      } else current = line;
    }
    lines.push(current);
  }
  const lineHeight = size * 1.25;
  if (lines.length * lineHeight > height - margin * 2)
    throw new Error(
      "The overlay text does not fit. Shorten it or use a smaller font.",
    );
  const x =
    overlay.align === "left"
      ? margin
      : overlay.align === "right"
        ? width - margin
        : width / 2;
  lines.forEach((line, index) =>
    ctx.fillText(
      line,
      x,
      height - margin - (lines.length - 1 - index) * lineHeight,
      maxWidth,
    ),
  );
}

export async function processImage(
  file: File,
  options: ImageOptions,
): Promise<Artifact> {
  if (typeof OffscreenCanvas === "undefined")
    throw new Error(
      "Image processing requires OffscreenCanvas support in this browser.",
    );
  const bitmap = await decode(file);
  let canvas: OffscreenCanvas | undefined;
  let mark: ImageBitmap | undefined;
  try {
    const { x, y, w, h } = cropPixels(
      bitmap.width,
      bitmap.height,
      options.crop,
    );
    const rotate = options.rotate ?? 0;
    const turned = rotate % 180 !== 0;
    const width = options.width ?? (turned ? h : w),
      height = options.height ?? (turned ? w : h);
    boundedDimensions(width, height);
    const format =
      options.format === "original"
        ? (await inspectImage(file)).type
        : options.format;
    canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("The browser could not allocate an image canvas.");

    if (format === "image/jpeg" || options.fit) {
      ctx.fillStyle = options.background;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.save();
    if (options.fit) {
      const padding = Math.round(
        (Math.min(width, height) * (options.padding ?? 0)) / 100,
      );
      const innerW = width - padding * 2,
        innerH = height - padding * 2;
      const placement = fitRect(
        w,
        h,
        innerW,
        innerH,
        options.fit,
        options.positionX,
        options.positionY,
      );
      ctx.beginPath();
      ctx.rect(padding, padding, innerW, innerH);
      ctx.clip();
      ctx.drawImage(
        bitmap,
        x,
        y,
        w,
        h,
        padding + placement.x,
        padding + placement.y,
        placement.width,
        placement.height,
      );
    } else {
      ctx.translate(width / 2, height / 2);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
      const filters = `brightness(${options.brightness ?? 100}%) contrast(${options.contrast ?? 100}%) saturate(${options.saturation ?? 100}%) grayscale(${options.grayscale ? 100 : 0}%) blur(${options.blur ?? 0}px)`;
      if (
        filters !==
        "brightness(100%) contrast(100%) saturate(100%) grayscale(0%) blur(0px)"
      ) {
        if (!("filter" in ctx))
          throw new Error("Image filters are unavailable in this browser.");
        ctx.filter = filters;
      }
      const destW = turned ? height : width,
        destH = turned ? width : height;
      ctx.drawImage(bitmap, x, y, w, h, -destW / 2, -destH / 2, destW, destH);
    }
    ctx.restore();
    if (options.overlay) {
      const overlay = options.overlay;
      if (overlay.mark) {
        mark = await decode(overlay.mark);
        const margin = Math.min(width, height) * 0.04;
        const target = fitRect(
          mark.width,
          mark.height,
          (width * overlay.markSize) / 100,
          height / 3,
          "contain",
        );
        ctx.drawImage(
          mark,
          width - margin - target.width,
          margin,
          target.width,
          target.height,
        );
      }
      drawCaption(ctx, width, height, overlay);
    }
    const blob = await canvas.convertToBlob({
      type: format,
      quality: options.quality,
    });
    if (blob.type !== format)
      throw new Error("This browser cannot encode the selected image format.");
    return {
      name: `${baseName(file.name)}-toolnest.${imageExtension(format)}`,
      blob,
      detail: `${bitmap.width} × ${bitmap.height} → ${width} × ${height} px`,
      originalBytes: file.size,
    };
  } finally {
    bitmap.close();
    mark?.close();
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
  }
}
