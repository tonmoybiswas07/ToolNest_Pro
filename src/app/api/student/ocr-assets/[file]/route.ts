import { readFile } from "node:fs/promises";
import path from "node:path";

const assets = {
  "worker.min.js": "node_modules/tesseract.js/dist/worker.min.js",
  "tesseract-core-lstm.wasm.js":
    "node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm.js":
    "node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-relaxedsimd-lstm.wasm.js":
    "node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js",
  "ben.traineddata.gz":
    "node_modules/@tesseract.js-data/ben/4.0.0_best_int/ben.traineddata.gz",
  "eng.traineddata.gz":
    "node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz",
};

export function generateStaticParams() {
  return Object.keys(assets).map((file) => ({ file }));
}

export const dynamicParams = false;

export async function GET(
  _: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  if (!Object.hasOwn(assets, file)) return new Response(null, { status: 404 });
  const bytes = await readFile(
    path.join(process.cwd(), assets[file as keyof typeof assets]),
  );
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.endsWith(".js")
        ? "application/javascript"
        : "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
