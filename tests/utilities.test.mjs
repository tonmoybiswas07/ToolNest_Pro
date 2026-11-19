import assert from "node:assert/strict";
import { test } from "node:test";
import {
  transformUrl,
  convertCase,
  countText,
} from "../src/features/tools/utilities/text-engines.ts";
import {
  convertColor,
  parseCssColor,
} from "../src/features/tools/studios/design-engines.ts";

test("URL modes preserve their reserved character and plus semantics", () => {
  assert.equal(
    transformUrl("https://example.org/a b?q=x+y", "uri", false),
    "https://example.org/a%20b?q=x+y",
  );
  assert.equal(transformUrl("%2F%20", "uri", true), "%2F ");
  assert.equal(transformUrl("é /", "component", false), "%C3%A9%20%2F");
  assert.equal(transformUrl("a+b & ~", "form", false), "a%2Bb+%26+%7E");
  assert.equal(transformUrl("a%2Bb+%26+~", "form", true), "a+b & ~");
  assert.equal(transformUrl("a&b=c", "form", true), "a&b=c");
  assert.throws(() => transformUrl("%C0%AF", "form", true), /Malformed/);
  assert.throws(() => transformUrl("%ZZ", "component", true), /Malformed/);
});

test("Word counter handles Japanese, grapheme clusters and line boundaries", () => {
  const text = "日本語 café e\u0301 👩‍💻\r\n\r\nhello";
  const stats = countText(text, 120, "ja");
  assert.equal(stats.words, 4);
  assert.equal(stats.lines, 3);
  assert.equal(stats.paragraphs, 2);
  assert.equal(stats.characters - stats.graphemes, 5);
  assert.equal(stats.readingSeconds, 2);
  assert.equal(countText("", 120).lines, 0);
  const fallback = countText("hello world 👩‍💻", 120, "", null);
  assert.equal(fallback.words, 2);
  assert.equal(fallback.graphemes, fallback.characters);
  assert.equal(fallback.approximateSegmentation, true);
  assert.throws(() => countText(text, 0));
});

test("Case converter applies locale rules and preserves prose punctuation", () => {
  assert.equal(
    convertCase("“HELLO!” SECOND.", "Sentence case", "en", null),
    "“Hello!” Second.",
  );
  const punctuation = ".".repeat(100000);
  assert.equal(
    convertCase(punctuation, "Sentence case", "", null),
    punctuation,
  );
  assert.equal(convertCase("istanbul ı", "Uppercase", "tr"), "İSTANBUL I");
  assert.equal(convertCase("I İ", "Lowercase", "tr"), "ı i");
  assert.equal(
    convertCase("XMLHttpRequest こんにちは!", "snake_case"),
    "xml_http_request_こんにちは",
  );
  assert.equal(
    convertCase("“HELLO!” SECOND line.", "Sentence case", "en"),
    "“Hello!” Second line.",
  );
  assert.equal(convertCase("xml parser", "PascalCase"), "XmlParser");
  assert.equal(
    convertCase("already-camel case", "camelCase"),
    "alreadyCamelCase",
  );
});

test("Color conversion handles CSS alpha, percentage RGB and hue units", () => {
  assert.deepEqual(convertColor("#f008"), {
    hex: "#ff000088",
    rgb: "rgb(255 0 0 / 0.53333)",
    hsl: "hsl(0 100% 50% / 0.53333)",
  });
  assert.equal(convertColor("hsl(.5turn 100% 50% / 50%)").hex, "#00ffff80");
  assert.equal(convertColor("rgba(0,255,0,.25)").hex, "#00ff0040");
  assert.deepEqual(parseCssColor("rgb(0% 100% 0%)").rgb, [0, 255, 0]);
  for (const input of [
    "rgb(45 0 256)",
    "hsl(0 50 20%)",
    "#12",
    "rgb(0 0 0 / 150%)",
  ])
    assert.throws(() => convertColor(input));
});

import {
  calculatePercentage,
  decimal,
  formatNumber,
  unitConversion,
} from "../src/features/tools/utilities/number-engines.ts";
import { convertTimestamp } from "../src/features/tools/utilities/time-engine.ts";
import { Temporal as TemporalFallback } from "@js-temporal/polyfill";

test("Units distinguish gallon and storage standards and validate temperatures", () => {
  assert.equal(
    unitConversion(1, "Volume", "US liquid gallon", "Liter"),
    3.785411784,
  );
  assert.equal(
    unitConversion(1, "Volume", "Imperial gallon", "Liter"),
    4.54609,
  );
  assert.equal(
    unitConversion(1, "Digital storage", "Kibibyte", "Kilobyte"),
    1.024,
  );
  assert.ok(
    Math.abs(unitConversion(32, "Temperature", "Fahrenheit", "Celsius")) <
      1e-12,
  );
  assert.equal(
    unitConversion(-459.67, "Temperature", "Fahrenheit", "Kelvin"),
    0,
  );
  assert.throws(
    () => unitConversion(-1, "Temperature", "Kelvin", "Kelvin"),
    /absolute zero/,
  );
  assert.throws(() => unitConversion(1, "Length", "__proto__", "Meter"));
  assert.equal(formatNumber(0.000123456, 3), "0.000123");
});

test("Percentages handle signed values, reverse change and undefined operations", () => {
  assert.equal(calculatePercentage("of", -15, 200).value, -30);
  assert.equal(calculatePercentage("share", 2, 8).value, 25);
  assert.equal(calculatePercentage("delta", -50, -40).value, -20);
  assert.equal(calculatePercentage("apply", 80, -25).value, 60);
  assert.equal(calculatePercentage("reverse", 60, -25).value, 80);
  assert.throws(() => calculatePercentage("share", 2, 0));
  assert.throws(() => calculatePercentage("reverse", 2, -100));
  for (const invalid of ["", "1,000", "1e309", "1e-999", "Infinity"])
    assert.throws(() => decimal(invalid));
});

test("Timestamps handle signed epoch fractions and explicit ISO offsets", async () => {
  assert.equal(
    (await convertTimestamp("-0.001", "seconds", "UTC", "reject")).iso,
    "1969-12-31T23:59:59.999Z",
  );
  assert.equal(
    (await convertTimestamp("-1", "milliseconds", "UTC", "reject")).seconds,
    "-0.001",
  );
  assert.equal(
    (
      await convertTimestamp(
        "2025-11-02T01:30:00-04:00",
        "iso",
        "Asia/Dhaka",
        "reject",
      )
    ).iso,
    "2025-11-02T05:30:00.000Z",
  );
  await assert.rejects(
    convertTimestamp("2025-02-29T12:00:00Z", "iso", "UTC", "reject"),
    /invalid/i,
  );
  await assert.rejects(
    convertTimestamp("0", "seconds", "Bad/Zone", "reject"),
    /time zone/,
  );
});

test("Native and fallback handle repeated, skipped, and half-hour transitions", async () => {
  for (const loader of [undefined, async () => TemporalFallback]) {
    const convert = (value, zone, overlap) =>
      convertTimestamp(value, "local", zone, overlap, loader);
    await assert.rejects(
      convert("2025-11-02T01:30", "America/New_York", "reject"),
      /occurs twice/,
    );
    assert.equal(
      (await convert("2025-11-02T01:30", "America/New_York", "earlier")).iso,
      "2025-11-02T05:30:00.000Z",
    );
    assert.equal(
      (await convert("2025-11-02T01:30", "America/New_York", "later")).iso,
      "2025-11-02T06:30:00.000Z",
    );
    await assert.rejects(
      convert("2025-03-09T02:30", "America/New_York", "earlier"),
      /does not exist/,
    );
    const early = await convert(
      "2025-04-06T01:45",
      "Australia/Lord_Howe",
      "earlier",
    );
    const late = await convert(
      "2025-04-06T01:45",
      "Australia/Lord_Howe",
      "later",
    );
    assert.equal(late.milliseconds - early.milliseconds, 1800000);
  }
});

import { createHash } from "node:crypto";
import {
  generatePasswords,
  generateUuids,
  hashAlgorithms,
  hashFileLimit,
  hashInput,
  uuidExport,
  validateUuid,
} from "../src/features/tools/utilities/crypto-engines.ts";

test("SHA-2 hashes match known vectors and support local bytes", async () => {
  const checksum =
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
  assert.deepEqual(await hashInput("abc", "SHA-256", checksum.toUpperCase()), {
    hex: checksum,
    matches: true,
    algorithm: "SHA-256",
  });
  for (const algorithm of hashAlgorithms) {
    const bytes = Uint8Array.of(0, 1, 255, 2);
    const expected = createHash(algorithm.replace("-", "").toLowerCase())
      .update(bytes)
      .digest("hex");
    assert.equal((await hashInput(new Blob([bytes]), algorithm)).hex, expected);
  }
  assert.equal(
    (await hashInput("different", "SHA-256", checksum)).matches,
    false,
  );
  await assert.rejects(hashInput("abc", "SHA-256", "123"), /64-digit/);
  await assert.rejects(
    hashInput(new Blob([new Uint8Array(hashFileLimit + 1)]), "SHA-512"),
    /16 MB/,
  );
});

test("Passwords obey configured character groups and exclude ambiguous characters", () => {
  const config = {
    length: 12,
    count: 10,
    groups: ["uppercase", "lowercase", "numbers", "symbols"],
    excludeAmbiguous: true,
    requireEach: true,
  };
  const values = generatePasswords(config);
  assert.equal(values.length, 10);
  for (const value of values) {
    assert.equal(value.length, 12);
    assert.doesNotMatch(value, /[0Oo1lLI|]/);
    for (const group of [/[A-Z]/, /[a-z]/, /[2-9]/, /[^A-Za-z0-9]/])
      assert.match(value, group);
  }
  assert.throws(() => generatePasswords({ ...config, count: 51 }));
  assert.throws(() => generatePasswords({ ...config, groups: [] }));
});

test("UUIDs use v4 and export exact selected formats", () => {
  const values = generateUuids(30, true);
  assert.equal(new Set(values).size, 30);
  assert.ok(
    values.every(
      (item) =>
        validateUuid(item) === "Valid UUID v4." && item === item.toUpperCase(),
    ),
  );
  assert.match(uuidExport([values[0]], "csv"), /^uuid\r\n.+\r\n$/);
  assert.deepEqual(JSON.parse(uuidExport(values, "json")), values);
  assert.equal(uuidExport([values[0]], "txt"), values[0] + "\n");
  assert.throws(() => validateUuid("1234"));
  assert.throws(() => generateUuids(1001, false));
});
