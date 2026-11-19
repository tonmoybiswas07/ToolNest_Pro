export function pageRange(value: string, count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 500)
    throw new Error("This tool supports PDFs with 1–500 pages.");
  if (!value.trim()) return Array.from({ length: count }, (_, index) => index);
  const result: number[] = [];
  const seen = new Set<number>();
  for (const part of value.split(",")) {
    const match = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(part.trim());
    if (!match)
      throw new Error("Enter page numbers or ranges, such as 1-3, 5, 7-10.");
    const first = Number(match[1]),
      last = Number(match[2] ?? match[1]);
    if (first < 1 || last > count || last < first)
      throw new Error(`Use ascending ranges within pages 1–${count}.`);
    for (let page = first; page <= last; page++) {
      if (seen.has(page))
        throw new Error("Each page can be selected only once.");
      seen.add(page);
      result.push(page - 1);
    }
  }
  return result;
}
