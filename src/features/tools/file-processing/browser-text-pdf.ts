import "@fontsource-variable/noto-sans-bengali";
import { PDFDocument } from "pdf-lib";
import { MiB, type Artifact, type Job } from "./files";
import {
  justifyPdfLine,
  pdfLineX,
  pdfParagraphs,
  type PdfTextAlignment,
  textPdfLimit,
  textPdfPageSizes,
  wrapPdfText,
} from "./text-pdf-options";

export type PdfFontStyle = "sans-serif" | "serif" | "monospace";
export const pdfFontLimit = 10;

async function loadCustomFont(file: File) {
  if (file.size > pdfFontLimit * MiB)
    throw new Error("Choose a font no larger than 10 MB.");
  const bytes = await file.arrayBuffer();
  const header = new Uint8Array(bytes.slice(0, 4));
  const signature = String.fromCharCode(...header);
  if (
    !["OTTO", "wOFF", "wOF2", "true"].includes(signature) &&
    !(header[0] === 0 && header[1] === 1 && header[2] === 0 && header[3] === 0)
  ) {
    throw new Error("Choose a valid TTF, OTF, WOFF, or WOFF2 font.");
  }
  try {
    const family = `ToolNest PDF ${crypto.randomUUID()}`;
    const face = new FontFace(family, bytes, { display: "block" });
    await face.load();
    return face;
  } catch {
    throw new Error("The browser could not load this font file.");
  }
}

export async function renderBrowserTextPdf(
  text: string,
  pageSize: keyof typeof textPdfPageSizes,
  fontStyle: PdfFontStyle,
  file: File | undefined,
  alignment: PdfTextAlignment,
  { signal, progress }: Job,
): Promise<Artifact[]> {
  if (!text.trim() || text.length > textPdfLimit)
    throw new Error("Enter between 1 and 100,000 characters.");
  progress("Preparing browser fonts…");
  const containsBangla = /\p{Script=Bengali}/u.test(text);
  const custom = file ? await loadCustomFont(file) : undefined;
  if (containsBangla) {
    const loaded = await document.fonts.load(
      '400 14px "Noto Sans Bengali Variable"',
      "বাংলা",
    );
    if (!loaded.length && !custom)
      throw new Error(
        "The bundled Bengali font could not load. Reload the page and try again.",
      );
  }
  signal.throwIfAborted();
  const canvas = document.createElement("canvas");
  if (custom) document.fonts.add(custom);
  try {
    const pdf = await PDFDocument.create();
    const [width, height] = textPdfPageSizes[pageSize];
    const [margin, size, lineHeight, scale] = [48, 13, 21, 2];
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx)
      throw new Error("This browser does not support canvas PDF rendering.");
    ctx.scale(scale, scale);
    const systemFonts = {
      "sans-serif": "Arial",
      serif: "Times New Roman",
      monospace: "Courier New",
    };
    ctx.font = `400 ${size}px ${custom ? `"${custom.family}", ` : ""}"${systemFonts[fontStyle]}", "Noto Sans Bengali Variable", ${fontStyle}`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    const measure = (value: string) => ctx.measureText(value).width;
    let y = margin + size;
    let totalBytes = 0;
    const clearPage = () => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width + 1, height + 1);
      ctx.fillStyle = "#111";
      y = margin + size;
    };
    async function savePage() {
      signal.throwIfAborted();
      if (pdf.getPageCount() >= 150)
        throw new Error("The browser-font PDF would exceed 150 pages.");
      progress(`Writing page ${pdf.getPageCount() + 1}…`);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      signal.throwIfAborted();
      if (!blob) throw new Error("The browser could not encode a PDF page.");
      totalBytes += blob.size;
      if (totalBytes > 48 * MiB)
        throw new Error("The rendered text exceeds 48 MB. Use less text.");
      const image = await pdf.embedPng(await blob.arrayBuffer());
      pdf
        .addPage([width, height])
        .drawImage(image, { x: 0, y: 0, width, height });
    }
    clearPage();
    for (const paragraph of pdfParagraphs(text)) {
      const firstLetter = paragraph.match(/\p{L}/u)?.[0] ?? "";
      const rtl =
        /\p{Script=Arabic}|\p{Script=Hebrew}|\p{Script=Syriac}|\p{Script=Thaana}/u.test(
          firstLetter,
        );
      ctx.direction = rtl ? "rtl" : "ltr";
      for (const line of wrapPdfText(paragraph, width - margin * 2, measure)) {
        if (y > height - margin) {
          await savePage();
          clearPage();
        }
        const justified =
          alignment === "justify"
            ? justifyPdfLine(line, width - margin * 2, measure)
            : undefined;
        if (justified) {
          if (typeof ctx.wordSpacing !== "string") {
            throw new Error(
              "Justified alignment with browser fonts requires a newer browser.",
            );
          }
          ctx.wordSpacing = `${justified.spacing}px`;
          ctx.fillText(
            justified.text,
            margin + (rtl ? 0 : justified.indent),
            y,
          );
          ctx.wordSpacing = "0px";
        } else if (line.text) {
          ctx.fillText(
            line.text,
            pdfLineX(
              alignment,
              width,
              margin,
              measure(line.text),
              rtl ? "rtl" : "ltr",
            ),
            y,
          );
        }
        y += lineHeight;
      }
    }
    await savePage();
    const bytes = await pdf.save();
    signal.throwIfAborted();
    const count = pdf.getPageCount();
    return [
      {
        name: "text.pdf",
        blob: new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
        pageCount: count,
        detail: `${count} ${count === 1 ? "page" : "pages"} · Browser fonts (image-based)`,
      },
    ];
  } finally {
    canvas.width = canvas.height = 1;
    if (custom) document.fonts.delete(custom);
  }
}
