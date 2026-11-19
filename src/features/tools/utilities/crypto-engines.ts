export const hashAlgorithms = ["SHA-256", "SHA-384", "SHA-512"] as const;
export type HashAlgorithm = (typeof hashAlgorithms)[number];
export const hashFileLimit = 16 * 1024 * 1024;

export async function hashInput(
  input: string | Blob,
  algorithm: HashAlgorithm,
  checksum = "",
) {
  if (!globalThis.crypto?.subtle)
    throw new Error("Web Crypto hashing requires a secure browser context.");
  if (!hashAlgorithms.includes(algorithm))
    throw new Error("Choose a supported SHA-2 algorithm.");
  const expected = checksum.trim().toLowerCase();
  const digits = { "SHA-256": 64, "SHA-384": 96, "SHA-512": 128 }[algorithm];
  if (
    expected &&
    (expected.length !== digits || !/^[0-9a-f]+$/.test(expected))
  ) {
    throw new Error(
      `Enter a ${digits}-digit hexadecimal checksum for ${algorithm}.`,
    );
  }
  if (typeof input === "string" && input.length > 100000)
    throw new Error("Use 100,000 text characters or fewer.");
  if (input instanceof Blob && input.size > hashFileLimit)
    throw new Error("Choose a file of 16 MB or smaller.");
  const data =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : await input.arrayBuffer();
  const result = await globalThis.crypto.subtle.digest(algorithm, data);
  const hex = Array.from(new Uint8Array(result), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return { hex, matches: expected ? hex === expected : null, algorithm };
}

export const characterGroups = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/~",
} as const;
export type CharacterGroup = keyof typeof characterGroups;
const ambiguous = /[0Oo1lLI|]/g;

function validateInteger(
  value: number,
  min: number,
  max: number,
  label: string,
) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
}

export function generatePasswords({
  length,
  count,
  groups,
  excludeAmbiguous,
  requireEach,
}: {
  length: number;
  count: number;
  groups: CharacterGroup[];
  excludeAmbiguous: boolean;
  requireEach: boolean;
}) {
  validateInteger(length, 4, 256, "Password length");
  validateInteger(count, 1, 50, "Batch size");
  if (
    !groups.length ||
    groups.some((group) => !Object.hasOwn(characterGroups, group))
  )
    throw new Error("Select at least one character group.");
  const sets = [...new Set(groups)].map((group) =>
    excludeAmbiguous
      ? characterGroups[group].replace(ambiguous, "")
      : characterGroups[group],
  );
  if (requireEach && length < sets.length)
    throw new Error(
      "Increase the length to fit every required character group.",
    );
  if (!globalThis.crypto?.getRandomValues)
    throw new Error("Secure random generation is unavailable in this browser.");
  const alphabet = sets.join("");
  const ceiling = 256 - (256 % alphabet.length);
  const bytes = new Uint8Array(256);
  let cursor = bytes.length;

  function nextCharacter() {
    for (;;) {
      if (cursor === bytes.length) {
        globalThis.crypto.getRandomValues(bytes);
        cursor = 0;
      }
      const sample = bytes[cursor++];
      if (sample < ceiling) return alphabet[sample % alphabet.length];
    }
  }

  try {
    return Array.from({ length: count }, () => {
      for (let attempt = 0; attempt < 1024; attempt++) {
        const password = Array.from({ length }, nextCharacter).join("");
        if (
          !requireEach ||
          sets.every((set) =>
            Array.from(password).some((char) => set.includes(char)),
          )
        )
          return password;
      }
      throw new Error(
        "Could not satisfy every required group. Increase the password length and try again.",
      );
    });
  } finally {
    bytes.fill(0);
  }
}

export function generateUuids(count: number, uppercase: boolean) {
  validateInteger(count, 1, 1000, "Batch size");
  if (typeof globalThis.crypto?.randomUUID !== "function")
    throw new Error("UUID generation requires a secure browser context.");
  return Array.from({ length: count }, () => {
    const uuid = globalThis.crypto.randomUUID();
    return uppercase ? uuid.toUpperCase() : uuid;
  });
}

export function validateUuid(raw: string) {
  const value = raw.trim().toLowerCase();
  if (value === "00000000-0000-0000-0000-000000000000")
    return "Valid nil UUID.";
  if (value === "ffffffff-ffff-ffff-ffff-ffffffffffff")
    return "Valid max UUID.";
  const match =
    /^[0-9a-f]{8}-[0-9a-f]{4}-([1-8])[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.exec(
      value,
    );
  if (!match)
    throw new Error(
      "Enter a canonical UUID with an RFC variant and version, or the nil or max UUID.",
    );
  return `Valid UUID v${match[1]}.`;
}

export function uuidExport(values: string[], format: "txt" | "csv" | "json") {
  if (format === "json") return JSON.stringify(values, null, 2) + "\n";
  if (format === "csv") return `uuid\r\n${values.join("\r\n")}\r\n`;
  return values.join("\n") + "\n";
}
