import assert from "node:assert/strict";
import { test } from "node:test";
import QRCode from "qrcode";
import { createTwoFilesPatch, diffLines } from "diff";
import {
  inspectJwt,
  inferType,
  jsonText,
  jsonToCsv,
  parseJson,
} from "../src/features/tools/studios/data-engines.ts";
import { matchRegex } from "../src/features/tools/studios/regex-engine.ts";
import {
  colorScale,
  contrast,
  glassStyles,
  gradientCss,
  hslFromRgb,
  rgbFromHex,
} from "../src/features/tools/studios/design-engines.ts";
import {
  qrFields,
  qrPayload,
  qrSvg,
} from "../src/features/tools/studios/qr-data.ts";
import {
  blankPrompt,
  composePrompt,
  filteredNotes,
  isNotes,
  isTemplates,
  noteFileName,
} from "../src/features/tools/studios/writing-engines.ts";

test("JSON preserves primitive values and high-precision numbers", () => {
  const source =
    '{"arr":[9007199254740993,{"ok":true}],"exp":1e999,"val":null}';
  const data = parseJson(source);
  assert.equal(jsonText(data), source);
  assert.match(inferType(data), /Array<number \| .*boolean/);
  assert.throws(() => parseJson("{bad"));
  for (const input of ["null", "false", '"text"', "123", "[]"])
    assert.equal(jsonText(parseJson(input)), input);
});

test("JSON to CSV preserves exact numbers, nested documents, and missing cells", () => {
  const value = parseJson('[{"name":"Ana\\rLee","grade":9007199254740993,"data":{"ok":true}},{"name":"=1+1","extra":true},{"__proto__":"own"}]');
  const csv = jsonToCsv(value);
  assert.equal(csv, [
    "name,grade,data,extra,__proto__",
    '"Ana\rLee",9007199254740993,"{""ok"":true}",,',
    "'=1+1,,,true,",
    ",,,,own",
    "",
  ].join("\r\n"));
  assert.match(jsonToCsv(value, false), /\n=1\+1,,,true,/);
  assert.throws(() => jsonToCsv(parseJson('[{"name":"Ana"},42]')), /array of objects/);
});

test("JWT handles expiration, absent claims, and malformed structures", () => {
  const segment = (data) =>
    Buffer.from(JSON.stringify(data)).toString("base64url");
  const token = (claims) =>
    [segment({ alg: "none" }), segment(claims), ""].join(".");
  assert.equal(inspectJwt(token({ exp: 10 }), 11000).status, "Expired");
  assert.equal(inspectJwt(token({})).expiration, null);
  assert.throws(() => inspectJwt("broken"));
  assert.throws(() =>
    inspectJwt([segment({ alg: "HS256" }), segment({}), ""].join(".")),
  );
});

test("Regex handles capture groups, flags, zero matches and zero-width matches", () => {
  assert.equal(
    matchRegex("(?<first>a)(b)?", "a ab", "g").matches[1].named.first,
    "a",
  );
  assert.equal(matchRegex("z", "abc", "g").matches.length, 0);
  assert.equal(matchRegex("(?=a)", "aa", "g").matches.length, 2);
  assert.equal(matchRegex("^a.$", "A\n\nB", "ism").matches.length, 1);
  assert.throws(() => matchRegex("(", "a", "g"));
  const longCapture = matchRegex("(a+)", "a".repeat(1000), "g");
  assert.equal(longCapture.matches[0].text.length, 1000);
  assert.ok(longCapture.capturesTruncated);
  assert.equal(longCapture.matches[0].groups[0].length, 513);
});

test("Diff supports identical, added, removed, and changed lines", () => {
  assert.deepEqual(
    diffLines("same", "same").map((change) => change.count),
    [1],
  );
  assert.match(createTwoFilesPatch("a", "b", "old\n", "new\n"), /-old\n\+new/);
  assert.match(createTwoFilesPatch("a", "b", "", "line\n"), /\+line/);
  assert.match(createTwoFilesPatch("a", "b", "line\n", ""), /-line/);
});

test("Color conversions, gradients and glass CSS produce expected values", () => {
  assert.deepEqual(rgbFromHex("#39f"), [51, 153, 255]);
  assert.deepEqual(hslFromRgb([255, 0, 0]), { h: 0, s: 100, l: 50 });
  assert.equal(contrast([255, 255, 255], [0, 0, 0]), 21);
  assert.equal(
    colorScale([12, 34, 56]).find((shade) => shade.level === 500).hex,
    "#0c2238",
  );
  const stops = [
    { color: "#fff", position: 100 },
    { color: "#000", position: 0 },
    { color: "#bbb", position: 40 },
  ];
  assert.equal(
    gradientCss("linear", 45, stops),
    "linear-gradient(45deg, #000 0%, #bbb 40%, #fff 100%)",
  );
  assert.equal(
    gradientCss("radial", 0, stops),
    "radial-gradient(circle, #000 0%, #bbb 40%, #fff 100%)",
  );
  assert.equal(
    glassStyles("#fff", 45, 19, 10, 15, 20).backdropFilter,
    "blur(19px)",
  );
});

test("QR encodes URLs, Wi-Fi and vCard with escaped fields", () => {
  const url = qrPayload("url", { ...qrFields, content: "https://example.org" });
  assert.equal(url, "https://example.org/");
  assert.throws(() =>
    qrPayload("url", { ...qrFields, content: "javascript:alert(1)" }),
  );
  const wifi = qrPayload("wifi", {
    ...qrFields,
    ssid: "Cafe; WiFi",
    password: "pass,word",
  });
  assert.equal(wifi, "WIFI:T:WPA;S:Cafe\\; WiFi;P:pass\\,word;H:false;;");
  assert.throws(() =>
    qrPayload("wifi", { ...qrFields, ssid: "Cafe", password: "short" }),
  );
  const card = qrPayload("contact", {
    ...qrFields,
    name: "Jane, Doe",
    email: "jane@example.org",
  });
  assert.match(card, /FN:Jane\\, Doe\r\n/);
  for (const payload of [url, wifi, card])
    assert.ok(QRCode.create(payload).modules.size >= 21);
  assert.match(
    qrSvg("M4 4h1v1h-1z", 29, 320, "#000", "#fff"),
    /viewBox="0 0 29 29"/,
  );
});

test("Prompt and notes helpers validate, format, and search local data", () => {
  assert.equal(composePrompt(blankPrompt), "");
  const fields = {
    ...blankPrompt,
    title: " Test ",
    task: "Summarize",
    exampleInput: "A",
    exampleOutput: "B",
  };
  assert.match(
    composePrompt(fields),
    /# Test\n\n## Task description\nSummarize/,
  );
  assert.match(composePrompt(fields), /## Example output\nB/);
  assert.ok(isTemplates([{ id: "a", fields }]));
  const notes = [
    {
      id: "1",
      title: "First",
      content: "Examples",
      tags: "docs",
      pinned: false,
      updated: 2,
    },
    {
      id: "2",
      title: "Second",
      content: "# Markdown",
      tags: "work",
      pinned: true,
      updated: 1,
    },
  ];
  assert.ok(isNotes(notes));
  assert.equal(filteredNotes(notes, "DOCS", "recent")[0].id, "1");
  assert.equal(filteredNotes(notes, "", "recent")[0].id, "2");
  assert.equal(noteFileName(" Useful Note! "), "useful-note.md");
});
