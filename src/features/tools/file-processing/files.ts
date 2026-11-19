export const MiB = 1024 * 1024;
export const imageFormats = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageFormat = (typeof imageFormats)[number];
export type ImageInfo = { type: ImageFormat; width: number; height: number };
export type Artifact = {
  pageCount?: number;
  name: string;
  blob: Blob;
  detail?: string;
  originalBytes?: number;
  source?: File;
};
export type Job = { signal: AbortSignal; progress: (message: string) => void };

const suffixes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const imageExtension = (format: ImageFormat) => suffixes[format];
export const baseName = (name: string) =>
  name
    .replace(/\.[^.]+$/, "")
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .slice(0, 100) || "file";
export const fileSize = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < MiB
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / MiB).toFixed(2)} MB`;

export function boundedDimensions(
  width: number,
  height: number,
  maxPixels = 16000000,
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 8192 ||
    height > 8192 ||
    width * height > maxPixels
  ) {
    throw new Error(
      `Use positive whole dimensions up to 8,192 px and ${(maxPixels / 1000000).toFixed(0)} megapixels.`,
    );
  }
}

export function imageHeader(bytes: Uint8Array): ImageInfo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const str = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));
  if (
    bytes.length >= 24 &&
    bytes[0] === 137 &&
    str(1, 8) === "PNG\r\n\x1a\n" &&
    str(12, 16) === "IHDR"
  ) {
    return {
      type: "image/png",
      width: view.getUint32(16),
      height: view.getUint32(20),
    };
  }
  if (bytes.length >= 30 && str(0, 4) === "RIFF" && str(8, 12) === "WEBP") {
    const chunk = str(12, 16);
    if (chunk === "VP8X")
      return {
        type: "image/webp",
        width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
        height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
      };
    if (chunk === "VP8L" && bytes[20] === 47) {
      const bits = view.getUint32(21, true);
      return {
        type: "image/webp",
        width: 1 + (bits & 16383),
        height: 1 + ((bits >>> 14) & 16383),
      };
    }
    if (
      chunk === "VP8 " &&
      bytes[23] === 157 &&
      bytes[24] === 1 &&
      bytes[25] === 42
    ) {
      return {
        type: "image/webp",
        width: view.getUint16(26, true) & 16383,
        height: view.getUint16(28, true) & 16383,
      };
    }
  }
  if (bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 8 < bytes.length && bytes[offset++] === 255) {
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 218 || marker === 217 || offset + 2 > bytes.length) break;
      const size = view.getUint16(offset);
      if (size < 2 || offset + size > bytes.length) break;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        size >= 8
      ) {
        return {
          type: "image/jpeg",
          width: view.getUint16(offset + 5),
          height: view.getUint16(offset + 3),
        };
      }
      offset += size;
    }
  }
  throw new Error(
    "Unsupported or damaged image. Choose a JPG, PNG, or WebP file.",
  );
}

export async function inspectImage(file: Blob) {
  const info = imageHeader(
    new Uint8Array(await file.slice(0, 512 * 1024).arrayBuffer()),
  );
  boundedDimensions(info.width, info.height);
  return info;
}

export async function validatePdf(file: Blob) {
  const data = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  if (!/%PDF-\d\.\d/.test(new TextDecoder().decode(data)))
    throw new Error("The file does not have a valid PDF signature.");
}

export async function makeZip(files: Artifact[], signal?: AbortSignal) {
  const { zipSync } = await import("fflate");
  const entries: Record<string, Uint8Array> = Object.create(null);
  let total = 0;
  for (const { name, blob } of files) {
    signal?.throwIfAborted();
    total += blob.size;
    if (total > 96 * MiB)
      throw new Error(
        "The archive exceeds 96 MB. Download results individually.",
      );
    const ext = name.split(".").at(-1) ?? "bin";
    let entry = `${baseName(name)}.${ext}`;
    for (let i = 2; Object.hasOwn(entries, entry); i++)
      entry = `${baseName(name)}-${i}.${ext}`;
    entries[entry] = new Uint8Array(await blob.arrayBuffer());
  }
  const zipped = zipSync(entries, { level: 0 });
  return new Blob([new Uint8Array(zipped)], { type: "application/zip" });
}
