type TemporalAPI = typeof import("@js-temporal/polyfill").Temporal;
export type TimeMode = "seconds" | "milliseconds" | "iso" | "local";
export type Overlap = "reject" | "earlier" | "later";

export async function getTemporal() {
  const native = (globalThis as typeof globalThis & { Temporal?: TemporalAPI })
    .Temporal;
  if (native?.Instant && native.PlainDateTime) return native;
  return (await import("@js-temporal/polyfill")).Temporal;
}

function parseEpoch(input: string, mode: "seconds" | "milliseconds") {
  const match = /^([+-]?)(\d+)(?:\.(\d{1,3}))?$/.exec(input);
  if (!match || (mode === "milliseconds" && match[3])) {
    throw new Error(
      mode === "seconds"
        ? "Enter Unix seconds with up to three fractional digits."
        : "Enter whole Unix milliseconds.",
    );
  }
  const whole = BigInt(match[2]);
  const fraction = BigInt((match[3] ?? "").padEnd(3, "0"));
  const absolute = mode === "seconds" ? whole * BigInt(1000) + fraction : whole;
  if (absolute > BigInt(8640000000000000))
    throw new Error("The timestamp is outside the supported date range.");
  return Number(match[1] === "-" ? -absolute : absolute);
}

const dateShape =
  "\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(?::[0-5]\\d(?:\\.\\d{1,3})?)?";
const localShape = new RegExp(`^${dateShape}$`);
const isoShape = new RegExp(`^${dateShape}(?:Z|[+-]\\d{2}:\\d{2})$`, "i");

export async function convertTimestamp(
  raw: string,
  mode: TimeMode,
  timeZone: string,
  overlap: Overlap,
  loadTemporal = getTemporal,
) {
  const input = raw.trim();
  if (!input || input.length > 60)
    throw new Error("Enter a valid timestamp or date and time.");
  const zone = timeZone.trim();
  let formatter: Intl.DateTimeFormat;
  try {
    if (!/^[A-Za-z][A-Za-z0-9_+/-]{0,79}$/.test(zone)) throw new Error();
    formatter = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: zone,
    });
  } catch {
    throw new Error(
      "Choose a valid IANA time zone, such as UTC or Asia/Dhaka.",
    );
  }

  let milliseconds: number;
  let overlapLabel: string | undefined;
  if (mode === "seconds" || mode === "milliseconds") {
    milliseconds = parseEpoch(input, mode);
  } else {
    const temporal = await loadTemporal();
    if (mode === "iso") {
      if (!isoShape.test(input))
        throw new Error(
          "Enter an ISO 8601 date and time with Z or an explicit ±HH:MM offset.",
        );
      try {
        milliseconds = temporal.Instant.from(input).epochMilliseconds;
      } catch {
        throw new Error("The ISO 8601 date or offset is invalid.");
      }
    } else {
      if (!localShape.test(input))
        throw new Error(
          "Enter a local date and time, such as 2025-11-02T01:30.",
        );
      let pair;
      try {
        const local = temporal.PlainDateTime.from(input);
        const earlier = local.toZonedDateTime(zone, {
          disambiguation: "earlier",
        });
        const later = local.toZonedDateTime(zone, { disambiguation: "later" });
        pair = {
          earlier,
          later,
          exists:
            earlier.toPlainDateTime().equals(local) &&
            later.toPlainDateTime().equals(local),
        };
      } catch {
        throw new Error("The local date or time is invalid.");
      }
      if (!pair.exists)
        throw new Error(
          "This local time does not exist in the selected zone. Choose a time outside the clock-change gap.",
        );
      if (pair.earlier.epochMilliseconds !== pair.later.epochMilliseconds) {
        if (overlap === "reject")
          throw new Error(
            "This local time occurs twice. Choose the earlier or later occurrence and convert again.",
          );
        overlapLabel = `Used the ${overlap} occurrence (${pair[overlap].offset}).`;
      }
      milliseconds = (overlap === "later" ? pair.later : pair.earlier)
        .epochMilliseconds;
    }
  }
  const date = new Date(milliseconds);
  const absolute = Math.abs(milliseconds);
  const remainder = absolute % 1000;
  const seconds = `${milliseconds < 0 ? "-" : ""}${Math.floor(absolute / 1000)}${remainder ? "." + String(remainder).padStart(3, "0").replace(/0+$/, "") : ""}`;
  return {
    iso: date.toISOString(),
    utc: date.toUTCString(),
    milliseconds,
    seconds,
    zoned: formatter.format(date),
    zone,
    overlapLabel,
  };
}
