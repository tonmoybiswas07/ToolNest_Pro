export type Match = {
  index: number;
  text: string;
  groups: (string | null)[];
  named: Record<string, string | null>;
};

export function matchRegex(pattern: string, text: string, flags: string) {
  if (pattern.length > 500 || text.length > 30000)
    throw new Error(
      "Use up to 500 pattern characters and 30,000 text characters.",
    );
  const regex = new RegExp(pattern, flags);
  const matches: Match[] = [];
  let truncated = false;
  let capturesTruncated = false;
  let remainingCaptureCharacters = 256000;

  function previewCapture(value: string | undefined) {
    if (value === undefined) return null;
    const limit = Math.min(512, remainingCaptureCharacters);
    const length = Math.min(value.length, limit);
    remainingCaptureCharacters -= length;
    if (length === value.length) return value;
    capturesTruncated = true;
    return value.slice(0, length) + "…";
  }
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    if (matches.length === 500) {
      truncated = true;
      break;
    }
    matches.push({
      index: match.index,
      text: match[0],
      groups: match.slice(1).map(previewCapture),
      named: Object.fromEntries(
        Object.entries(match.groups ?? {}).map(([key, value]) => [
          key,
          previewCapture(value),
        ]),
      ),
    });
    if (!regex.global) break;
    if (!match[0].length) regex.lastIndex++;
  }
  return { matches, truncated, capturesTruncated };
}
