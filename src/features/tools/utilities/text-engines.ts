export const textLimit = 100000;
export type UrlMode = "component" | "uri" | "form";

function checkLength(value: string) {
  if (value.length > textLimit)
    throw new Error("Use 100,000 characters or fewer.");
}

export function transformUrl(value: string, mode: UrlMode, decode: boolean) {
  checkLength(value);
  if (!value.length) throw new Error("Enter text to transform.");
  if (/[\uD800-\uDFFF]/u.test(value))
    throw new Error("The input contains an unpaired Unicode surrogate.");
  try {
    if (mode === "form") {
      if (!decode)
        return new URLSearchParams([["value", value]]).toString().slice(6);
      decodeURIComponent(value.replace(/\+/g, " "));
      return (
        new URLSearchParams(`value=${value.replace(/&/g, "%26")}`).get(
          "value",
        ) ?? ""
      );
    }
    if (mode === "uri") return decode ? decodeURI(value) : encodeURI(value);
    return decode ? decodeURIComponent(value) : encodeURIComponent(value);
  } catch {
    throw new Error(
      "Malformed percent encoding or invalid UTF-8 in the input.",
    );
  }
}

function localeTag(locale: string) {
  if (!locale.trim()) return undefined;
  try {
    return Intl.getCanonicalLocales(locale.trim())[0];
  } catch {
    throw new Error("Enter a valid locale, such as en, tr, or ja.");
  }
}

export function countText(
  text: string,
  wordsPerMinute: number,
  locale = "",
  segmenter: typeof Intl.Segmenter | null = Intl.Segmenter,
) {
  checkLength(text);
  const language = localeTag(locale);
  if (
    !Number.isInteger(wordsPerMinute) ||
    wordsPerMinute < 1 ||
    wordsPerMinute > 1200
  ) {
    throw new Error(
      "Reading speed must be a whole number from 1 to 1,200 words per minute.",
    );
  }
  const codePoints = Array.from(text);
  const normalized = text.replace(/\r\n|\r|\u2028|\u2029/g, "\n");
  let words = 0;
  let graphemes = 0;
  if (segmenter) {
    for (const word of new segmenter(language, { granularity: "word" }).segment(
      text,
    )) {
      if (word.isWordLike) words++;
    }
    for (const part of new segmenter(language, {
      granularity: "grapheme",
    }).segment(text)) {
      graphemes += Number(Boolean(part.segment));
    }
  } else {
    words = (
      text.match(
        /[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:['’][\p{L}\p{N}\p{M}]+)*/gu,
      ) ?? []
    ).length;
    graphemes = codePoints.length;
  }
  return {
    words,
    graphemes,
    characters: codePoints.length,
    withoutWhitespace: codePoints.filter((character) => !/\s/u.test(character))
      .length,
    lines: text ? normalized.split("\n").length : 0,
    paragraphs: normalized
      .split(/\n(?:[^\S\n]*\n)+/)
      .filter((part) => part.trim()).length,
    readingSeconds: Math.ceil((words * 60) / wordsPerMinute),
    approximateSegmentation: !segmenter,
  };
}

export const caseModes = [
  "Uppercase",
  "Lowercase",
  "Title Case",
  "Sentence case",
  "camelCase",
  "PascalCase",
  "snake_case",
  "kebab-case",
] as const;
export type CaseMode = (typeof caseModes)[number];

export function convertCase(
  text: string,
  mode: CaseMode,
  locale = "",
  segmenter: typeof Intl.Segmenter | null = Intl.Segmenter,
) {
  checkLength(text);
  if (!text.trim()) throw new Error("Enter text to convert.");
  const language = localeTag(locale);
  const upper = (value: string) => value.toLocaleUpperCase(language);
  const lower = (value: string) => value.toLocaleLowerCase(language);
  const capitalize = (value: string) =>
    value.replace(/\p{L}/u, (letter) => upper(letter));
  if (mode === "Uppercase") return upper(text);
  if (mode === "Lowercase") return lower(text);
  if (mode === "Title Case") {
    if (!segmenter)
      return lower(text).replace(
        /[\p{L}\p{N}\p{M}]+(?:['’][\p{L}\p{N}\p{M}]+)*/gu,
        capitalize,
      );
    return Array.from(
      new segmenter(language, { granularity: "word" }).segment(text),
      (part) =>
        part.isWordLike ? capitalize(lower(part.segment)) : part.segment,
    ).join("");
  }
  if (mode === "Sentence case") {
    if (!segmenter) {
      let startsSentence = true;
      return lower(text).replace(/[.!?。！？\n]|\p{L}/gu, (character) => {
        if (/[.!?。！？\n]/u.test(character)) {
          startsSentence = true;
          return character;
        }
        const result = startsSentence ? upper(character) : character;
        startsSentence = false;
        return result;
      });
    }
    return Array.from(
      new segmenter(language, { granularity: "sentence" }).segment(text),
      (part) => capitalize(lower(part.segment)),
    ).join("");
  }
  const tokens =
    text
      .replace(/([\p{Lu}])(?=\p{Lu}\p{Ll})/gu, "$1 ")
      .replace(/([\p{Ll}\p{N}])(?=\p{Lu})/gu, "$1 ")
      .match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu) ?? [];
  if (!tokens.length)
    throw new Error("Identifier cases need at least one letter or number.");
  const words = tokens.map(lower);
  if (mode === "snake_case") return words.join("_");
  if (mode === "kebab-case") return words.join("-");
  return words
    .map((word, index) =>
      index === 0 && mode === "camelCase" ? word : capitalize(word),
    )
    .join("");
}
