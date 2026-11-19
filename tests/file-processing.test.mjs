import assert from "node:assert/strict";
import { test } from "node:test";
import { unzipSync } from "fflate";
import {
  imageHeader,
  boundedDimensions,
  validatePdf,
  makeZip,
} from "../src/features/tools/file-processing/files.ts";
import { pageRange } from "../src/features/tools/file-processing/pdf-ranges.ts";
import {
  tools,
  legacyToolRoutes,
  canonicalToolSlug,
} from "../src/features/tools/registry.ts";

test("Registry has 33 distinct tools, 30 active and three planned", () => {
  assert.equal(tools.length, 33);
  assert.equal(new Set(tools.map((tool) => tool.slug)).size, 33);
  assert.equal(tools.filter((tool) => tool.status === "Available").length, 30);
  assert.equal(
    tools.filter((tool) => tool.status === "Coming Soon").length,
    3,
  );
  assert.equal(legacyToolRoutes.size, 16);
  assert.deepEqual(tools.filter(tool => tool.status === "Coming Soon").map(tool => tool.slug),
    ["instagram-video-downloader", "tiktok-video-downloader", "threads-video-downloader"]);
  for (const [legacy, target] of legacyToolRoutes) {
    assert.notEqual(legacy, target.slug);
    assert.ok(tools.some((tool) => tool.slug === target.slug));
    assert.ok(!legacyToolRoutes.has(target.slug));
  }
  for (const mode of ["pdf-to-image", "image-to-pdf"]) {
    assert.deepEqual(legacyToolRoutes.get(mode), { slug: "pdf-toolkit", mode });
    assert.equal(canonicalToolSlug(mode), "pdf-toolkit");
  }
});

test("image headers enforce format and pixel bounds", () => {
  const png = new Uint8Array(24);
  png.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  png.set([73, 72, 68, 82], 12);
  const view = new DataView(png.buffer);
  view.setUint32(16, 400);
  view.setUint32(20, 300);
  assert.deepEqual(imageHeader(png), {
    type: "image/png",
    width: 400,
    height: 300,
  });
  assert.throws(() => imageHeader(new TextEncoder().encode("<svg/>")));
  assert.throws(() => boundedDimensions(8192, 8192));
  assert.throws(() => boundedDimensions(0, 100));
});

test("PDF ranges preserve ordering and reject invalid or duplicate pages", async () => {
  assert.deepEqual(pageRange("3,1-2,5", 5), [2, 0, 1, 4]);
  assert.deepEqual(pageRange("", 2), [0, 1]);
  for (const range of ["0", "4", "2-1", "1,1", "1-2,2", "a", "1,"])
    assert.throws(() => pageRange(range, 3));
  await assert.rejects(validatePdf(new Blob(["not a PDF"])));
});

test("ZIP keeps every output when filenames collide", async () => {
  const zip = await makeZip([
    { name: "same.pdf", blob: new Blob(["one"]) },
    { name: "same.pdf", blob: new Blob(["two"]) },
  ]);
  const decoded = unzipSync(new Uint8Array(await zip.arrayBuffer()));
  assert.deepEqual(Object.keys(decoded), ["same.pdf", "same-2.pdf"]);
});
