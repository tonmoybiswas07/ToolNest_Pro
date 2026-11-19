import {
  degrees,
  EncryptedPDFError,
  PDFDocument,
  rgb,
  StandardFonts,
} from "pdf-lib";
import { baseName, MiB, validatePdf, type Artifact } from "./files";
import { decode } from "./image-engine";
import { pageRange } from "./pdf-ranges";

export const pageLimit = 500;
export type PageEdit = { p: number; rotate: number };
export type Watermark = {
  text: string;
  opacity: number;
  position: "center" | "top" | "bottom";
};
export type Metadata = {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
};

export type PdfCommand =
  | { type: "inspect"; files: File[] }
  | { type: "merge"; files: File[] }
  | { type: "split"; file: File; range: string; separate: boolean }
  | { type: "optimize"; file: File }
  | {
      type: "toolkit";
      file: File;
      pages: PageEdit[];
      metadata: Metadata;
      watermark: Watermark;
      extract: boolean;
    }
  | {
      type: "images";
      files: File[];
      pageSize: "A4" | "Letter";
      orientation: "portrait" | "landscape";
      margin: number;
    }
  | {
      type: "raster";
      file: File;
      images: { blob: Blob; width: number; height: number }[];
    };

export async function loadPdf(file: File) {
  await validatePdf(file);
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(await file.arrayBuffer(), {
      updateMetadata: false,
    });
  } catch (error) {
    if (
      error instanceof EncryptedPDFError ||
      (error instanceof Error &&
        error.message.startsWith(
          "Input document to `PDFDocument.load` is encrypted.",
        ))
    )
      throw new Error(
        "Encrypted or password-protected PDFs are unsupported. Unlock the PDF in a trusted viewer first.",
      );
    throw new Error("The PDF is malformed or could not be opened.");
  }
  const count = pdf.getPageCount();
  if (count < 1 || count > pageLimit)
    throw new Error(`Choose a PDF with 1–${pageLimit} pages.`);
  return pdf;
}

function artifact(
  name: string,
  bytes: Uint8Array,
  count: number,
  originalBytes?: number,
  detail?: string,
): Artifact {
  if (bytes.length > 96 * MiB)
    throw new Error("Output exceeds 96 MB. Use fewer pages or files.");
  return {
    name,
    blob: new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    detail: `${count} ${count === 1 ? "page" : "pages"}${detail ? ` · ${detail}` : ""}`,
    originalBytes,
  };
}

async function copyPages(source: PDFDocument, indices: number[]) {
  const output = await PDFDocument.create();
  for (const page of await output.copyPages(source, indices))
    output.addPage(page);
  return output;
}

async function imageBytes(file: File) {
  const bitmap = await decode(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("The browser could not allocate an image canvas.");
    ctx.drawImage(bitmap, 0, 0);
    const png = await canvas.convertToBlob({ type: "image/png" });
    return {
      width: bitmap.width,
      height: bitmap.height,
      png: new Uint8Array(await png.arrayBuffer()),
    };
  } finally {
    bitmap.close();
    canvas.width = canvas.height = 1;
  }
}

export async function pdfCommand(
  input: PdfCommand,
  progress: (text: string) => void,
) {
  if (input.type === "inspect") {
    return Promise.all(
      input.files.map(async (file) => {
        const doc = await loadPdf(file);
        return {
          count: doc.getPageCount(),
          title: doc.getTitle() ?? "",
          author: doc.getAuthor() ?? "",
          subject: doc.getSubject() ?? "",
          keywords: doc.getKeywords() ?? "",
        };
      }),
    );
  }
  if (input.type === "merge") {
    if (input.files.length < 2)
      throw new Error("Choose at least two PDF files.");
    const out = await PDFDocument.create();
    for (const [index, file] of input.files.entries()) {
      progress(
        `Copying pages from document ${index + 1} of ${input.files.length}…`,
      );
      const source = await loadPdf(file);
      if (out.getPageCount() + source.getPageCount() > pageLimit)
        throw new Error("The merged document would exceed 500 pages.");
      for (const page of await out.copyPages(source, source.getPageIndices()))
        out.addPage(page);
    }
    return [artifact("merged.pdf", await out.save(), out.getPageCount())];
  }
  if (input.type === "images") {
    if (
      !Number.isFinite(input.margin) ||
      input.margin < 0 ||
      input.margin > 144
    )
      throw new Error("Use a margin from 0 to 144 points.");
    if (!input.files.length) throw new Error("Choose at least one image.");
    const out = await PDFDocument.create();
    let [w, h] = input.pageSize === "A4" ? [595.28, 841.89] : [612, 792];
    if (input.orientation === "landscape") [w, h] = [h, w];
    let pixelTotal = 0;
    for (const [index, file] of input.files.entries()) {
      progress(`Embedding image ${index + 1} of ${input.files.length}…`);
      const data = await imageBytes(file);
      pixelTotal += data.width * data.height;
      if (pixelTotal > 48000000)
        throw new Error(
          "Batch exceeds 48 megapixels. Process fewer or smaller images.",
        );
      const image = await out.embedPng(data.png);
      const factor = Math.min(
        (w - 2 * input.margin) / image.width,
        (h - 2 * input.margin) / image.height,
      );
      const width = image.width * factor,
        height = image.height * factor;
      out
        .addPage([w, h])
        .drawImage(image, {
          x: (w - width) / 2,
          y: (h - height) / 2,
          width,
          height,
        });
    }
    return [artifact("images.pdf", await out.save(), out.getPageCount())];
  }

  if (input.type === "raster") {
    const out = await PDFDocument.create();
    for (const item of input.images) {
      const image = await out.embedJpg(await item.blob.arrayBuffer());
      out
        .addPage([item.width, item.height])
        .drawImage(image, {
          x: 0,
          y: 0,
          width: item.width,
          height: item.height,
        });
    }
    return [
      artifact(
        `${baseName(input.file.name)}-rasterized.pdf`,
        await out.save(),
        out.getPageCount(),
        input.file.size,
        "Rasterized to JPEG",
      ),
    ];
  }

  const source = await loadPdf(input.file);
  const stem = baseName(input.file.name);
  if (input.type === "split") {
    const indices = pageRange(input.range, source.getPageCount());
    if (!input.separate) {
      progress(`Extracting ${indices.length} pages…`);
      const out = await copyPages(source, indices);
      return [
        artifact(`${stem}-extracted.pdf`, await out.save(), out.getPageCount()),
      ];
    }
    if (indices.length > 40)
      throw new Error("Choose up to 40 pages for separate files.");
    const results: Artifact[] = [];
    let total = 0;
    for (const [index, page] of indices.entries()) {
      progress(`Extracting page ${index + 1} of ${indices.length}…`);
      const out = await copyPages(source, [page]);
      const result = artifact(
        `${stem}-page-${page + 1}.pdf`,
        await out.save(),
        1,
      );
      total += result.blob.size;
      if (total > 96 * MiB)
        throw new Error("Output exceeds 96 MB. Select fewer pages.");
      results.push(result);
    }
    return results;
  }
  if (input.type === "optimize") {
    progress("Repacking PDF objects into compressed object streams…");
    const bytes = await source.save({
      useObjectStreams: true,
      updateFieldAppearances: false,
    });
    return [
      artifact(
        `${stem}-repacked.pdf`,
        bytes,
        source.getPageCount(),
        input.file.size,
        bytes.length < input.file.size
          ? "Structural repack reduced file size"
          : "Structural repack did not reduce file size",
      ),
    ];
  }

  const original = source.getPages();
  if (
    !input.pages.length ||
    new Set(input.pages.map((page) => page.p)).size !== input.pages.length ||
    input.pages.some(
      (page) =>
        !Number.isInteger(page.p) ||
        !original[page.p] ||
        ![0, 90, 180, 270].includes(page.rotate),
    )
  ) {
    throw new Error("Select at least one valid page without duplicates.");
  }
  progress("Applying page edits and document settings…");
  const output = input.extract
    ? await copyPages(
        source,
        input.pages.map((page) => page.p),
      )
    : source;
  if (
    !input.extract &&
    (original.length !== input.pages.length ||
      input.pages.some((page, index) => page.p !== index))
  ) {
    while (source.getPageCount()) source.removePage(0);
    for (const { p } of input.pages) source.addPage(original[p]);
  }
  const pages = output.getPages();
  pages.forEach((page, index) => {
    const angle = input.pages[index].rotate;
    if (angle)
      page.setRotation(degrees((page.getRotation().angle + angle) % 360));
  });
  if (input.metadata.title !== undefined) output.setTitle(input.metadata.title);
  if (input.metadata.author !== undefined)
    output.setAuthor(input.metadata.author);
  if (input.metadata.subject !== undefined)
    output.setSubject(input.metadata.subject);
  if (input.metadata.keywords !== undefined)
    output.setKeywords(
      input.metadata.keywords
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );
  if (input.watermark.text.trim()) {
    const font = await output.embedFont(StandardFonts.Helvetica);
    const text = input.watermark.text.trim();
    try {
      font.encodeText(text);
    } catch {
      throw new Error(
        "This watermark font supports Western Latin characters. Try a different label.",
      );
    }
    for (const page of pages) {
      const box = page.getCropBox();
      const angle = ((page.getRotation().angle % 360) + 360) % 360;
      const turned = angle === 90 || angle === 270;
      const width = turned ? box.height : box.width;
      const height = turned ? box.width : box.height;
      const size = Math.min(
        36,
        (width * 0.85) / font.widthOfTextAtSize(text, 1),
        height / 6,
      );
      const x = (width - font.widthOfTextAtSize(text, size)) / 2;
      const y =
        input.watermark.position === "center"
          ? (height - size) / 2
          : input.watermark.position === "top"
            ? height - size - height * 0.08
            : height * 0.08;
      const [localX, localY] =
        angle === 90
          ? [box.width - y, x]
          : angle === 180
            ? [box.width - x, box.height - y]
            : angle === 270
              ? [y, box.height - x]
              : [x, y];
      page.drawText(text, {
        x: box.x + localX,
        y: box.y + localY,
        size,
        font,
        rotate: degrees(angle),
        opacity: input.watermark.opacity,
        color: rgb(0.13, 0.15, 0.2),
      });
    }
  }
  return [
    artifact(
      `${stem}-edited.pdf`,
      await output.save({ updateFieldAppearances: false }),
      output.getPageCount(),
    ),
  ];
}
