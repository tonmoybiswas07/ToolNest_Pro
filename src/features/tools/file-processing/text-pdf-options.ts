export const textPdfLimit = 100_000;
export const textPdfPageSizes = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
} as const;

export const unsupportedPdfText = "This PDF font supports Western Latin text.";

export function* wrapPdfText(
  paragraph: string,
  maxWidth: number,
  measure: (text: string) => number,
) {
  let line = "";
  for (const token of paragraph.trimEnd().match(/ +|[^ ]+/g) ?? []) {
    if (line && measure(line + token) > maxWidth) {
      yield { text: line.trimEnd(), last: false };
      line = "";
      if (!token.trim()) continue;
    }
    if (measure(token) <= maxWidth) {
      line += token;
      continue;
    }
    const characters =
      typeof Intl.Segmenter === "function"
        ? Array.from(
            new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
              token,
            ),
            ({ segment }) => segment,
          )
        : Array.from(token);
    for (const character of characters) {
      if (line && measure(line + character) > maxWidth) {
        yield { text: line.trimEnd(), last: false };
        line = "";
      }
      line += character;
    }
  }
  yield { text: line.trimEnd(), last: true };
}

export const pdfParagraphs = (text: string) =>
  text
    .replace(/\r\n?|\u2028|\u2029/g, "\n")
    .replace(/\t/g, "    ")
    .split("\n");

export type PdfTextAlignment = "auto" | "left" | "center" | "right" | "justify";

export function pdfLineX(
  alignment: PdfTextAlignment,
  pageWidth: number,
  margin: number,
  lineWidth: number,
  direction: "ltr" | "rtl" = "ltr",
) {
  const remaining = Math.max(0, pageWidth - 2 * margin - lineWidth);
  if (alignment === "center") return margin + remaining / 2;
  if (
    alignment === "right" ||
    ((alignment === "auto" || alignment === "justify") && direction === "rtl")
  ) {
    return margin + remaining;
  }
  return margin;
}

export function justifyPdfLine(
  line: { text: string; last: boolean },
  maxWidth: number,
  measure: (text: string) => number,
) {
  if (line.last) return undefined;
  const text = line.text.replace(/^ +/, "");
  const spaces = text.match(/ /g)?.length ?? 0;
  if (!spaces) return undefined;
  const indent = measure(line.text.slice(0, line.text.length - text.length));
  const extra = maxWidth - indent - measure(text);
  return extra > 0 ? { text, indent, spacing: extra / spaces } : undefined;
}
