import { isLosslessNumber, parse, stringify } from "lossless-json";

export const MAX_JSON = 262144;

export function parseJson(source: string) {
  if (!source.trim()) throw new Error("Enter JSON to continue.");
  if (source.length > MAX_JSON)
    throw new Error("JSON is limited to 256 KB of text.");
  return parse(source) as unknown;
}

export function jsonText(value: unknown, spaces?: number) {
  return stringify(value, undefined, spaces) ?? "";
}

export function inferType(value: unknown, depth = 0): string {
  if (depth > 25) return "unknown";
  if (value === null) return "null";
  if (isLosslessNumber(value)) return "number";
  if (Array.isArray(value)) {
    const variants = [
      ...new Set(
        value.slice(0, 1000).map((item) => inferType(item, depth + 1)),
      ),
    ];
    return `Array<${variants.length ? variants.join(" | ") : "unknown"}>`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value).map(
      ([key, item]) => `${JSON.stringify(key)}: ${inferType(item, depth + 1)};`,
    );
    return `{ ${entries.join(" ")} }`;
  }
  return typeof value;
}

function claims(segment: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(segment) || segment.length % 4 === 1)
    throw new Error("A JWT segment is not valid Base64URL.");
  try {
    const binary = atob(segment.replaceAll("-", "+").replaceAll("_", "/"));
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(binary, (char) => char.charCodeAt(0)),
    );
    const data = parseJson(text);
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      isLosslessNumber(data)
    )
      throw new Error();
    return data as Record<string, unknown>;
  } catch {
    throw new Error("The JWT header and payload must be UTF-8 JSON objects.");
  }
}

function claimDate(value: unknown) {
  if (!isLosslessNumber(value)) return null;
  const date = new Date(Number(value.toString()) * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function inspectJwt(token: string, now = Date.now()) {
  const source = token.trim();
  if (!source || source.length > 65536)
    throw new Error("Enter a JWT no longer than 64 KB.");
  const parts = source.split(".");
  if (
    parts.length !== 3 ||
    !/^[A-Za-z0-9_-]*$/.test(parts[2]) ||
    parts[2].length % 4 === 1
  ) {
    throw new Error(
      "Enter a three-segment compact JWT. Encrypted JWTs are unsupported.",
    );
  }
  const header = claims(parts[0]);
  const payload = claims(parts[1]);
  if (
    typeof header.alg !== "string" ||
    !header.alg ||
    (header.alg === "none") !== (parts[2] === "")
  ) {
    throw new Error(
      "The algorithm and signature fields do not describe a valid compact JWT.",
    );
  }
  const expiration = claimDate(payload.exp);
  const issued = claimDate(payload.iat);
  const notBefore = claimDate(payload.nbf);
  const status =
    expiration && expiration.getTime() <= now
      ? "Expired"
      : notBefore && notBefore.getTime() > now
        ? "Not yet valid by decoded timing"
        : expiration
          ? "Unexpired by decoded timing"
          : "No usable expiration claim";
  return { header, payload, expiration, issued, status };
}
