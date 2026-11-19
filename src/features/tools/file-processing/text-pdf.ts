import {
  beginText,
  endText,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  setFontAndSize,
  setTextMatrix,
  setWordSpacing,
  showText,
  StandardFonts,
  type PDFName,
} from "pdf-lib";

import {
  justifyPdfLine,
  pdfLineX,
  pdfParagraphs,
  type PdfTextAlignment,
  textPdfLimit,
  textPdfPageSizes,
  unsupportedPdfText,
  wrapPdfText,
} from "./text-pdf-options";

export async function createTextPdf(
  text: string,
  pageSize: keyof typeof textPdfPageSizes,
  alignment: PdfTextAlignment,
) {
  if (!text.trim()) throw new Error("Enter some text to convert.");
  if (text.length > textPdfLimit)
    throw new Error("Enter up to 100,000 characters.");
  if (!Object.hasOwn(textPdfPageSizes, pageSize))
    throw new Error("Choose A4 or Letter.");

  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const [width, height] = textPdfPageSizes[pageSize];
  const margin = 48;
  const size = 12;
  const lineHeight = 17;
  const maxWidth = width - 2 * margin;
  const widths = new Map<string, number>();
  const measure = (value: string) => {
    if (alignment !== "justify") return font.widthOfTextAtSize(value, size);
    let width = 0;
    for (const character of value) {
      let advance = widths.get(character);
      if (advance === undefined) {
        advance = font.widthOfTextAtSize(character, size);
        widths.set(character, advance);
      }
      width += advance;
    }
    return width;
  };
  const paragraphs = pdfParagraphs(text);
  try {
    for (const paragraph of paragraphs) font.encodeText(paragraph);
  } catch {
    throw new Error(unsupportedPdfText);
  }

  let page = document.addPage([width, height]);
  let y = height - margin - size;
  let justifiedFont: PDFName | undefined;
  function writeLine(line: { text: string; last: boolean }) {
    if (y < margin) {
      if (document.getPageCount() >= 500)
        throw new Error("The PDF would exceed 500 pages.");
      page = document.addPage([width, height]);
      justifiedFont = undefined;
      y = height - margin - size;
    }
    const justified =
      alignment === "justify"
        ? justifyPdfLine(line, maxWidth, measure)
        : undefined;
    if (justified) {
      justifiedFont ??= page.node.newFontDictionary(font.name, font.ref);
      page.pushOperators(
        pushGraphicsState(),
        beginText(),
        setFontAndSize(justifiedFont, size),
        setTextMatrix(1, 0, 0, 1, margin + justified.indent, y),
        setWordSpacing(justified.spacing),
        showText(font.encodeText(justified.text)),
        endText(),
        popGraphicsState(),
      );
    } else if (line.text) {
      page.drawText(line.text, {
        x: pdfLineX(alignment, width, margin, measure(line.text)),
        y,
        font,
        size,
      });
    }
    y -= lineHeight;
  }

  for (const paragraph of paragraphs) {
    for (const line of wrapPdfText(paragraph, maxWidth, measure))
      writeLine(line);
  }

  return { bytes: await document.save(), count: document.getPageCount() };
}
