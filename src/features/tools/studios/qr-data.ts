export type QRKind = "url" | "text" | "wifi" | "contact";

export const qrFields = {
  content: "",
  ssid: "",
  password: "",
  security: "WPA",
  hidden: false,
  name: "",
  phone: "",
  email: "",
  company: "",
};

function qrEscape(value: string) {
  return value.replace(/[\\;,:"]/g, "\\$&");
}

function cardEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/[,;]/g, "\\$&");
}

export function qrPayload(kind: QRKind, fields: typeof qrFields) {
  const content = fields.content.trim();
  switch (kind) {
    case "url": {
      let url: URL;
      try {
        url = new URL(content);
      } catch {
        throw new Error("Enter a complete HTTP or HTTPS URL.");
      }
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new Error(
          "Use an HTTP or HTTPS URL without embedded credentials.",
        );
      return url.href;
    }
    case "text":
      if (!content) throw new Error("Enter text to encode.");
      return fields.content;
    case "wifi": {
      if (
        !fields.ssid ||
        new TextEncoder().encode(fields.ssid).length > 32 ||
        /[\x00-\x1f\x7f]/.test(fields.ssid)
      )
        throw new Error("Enter a network name of up to 32 UTF-8 bytes.");
      if (!["WPA", "WEP", "nopass"].includes(fields.security))
        throw new Error("Choose a supported Wi-Fi security type.");
      if (
        fields.security === "WPA" &&
        !(
          /^[\x20-\x7e]{8,63}$/.test(fields.password) ||
          /^[0-9a-f]{64}$/i.test(fields.password)
        )
      )
        throw new Error(
          "WPA requires an 8–63 character passphrase or a 64-digit hexadecimal key.",
        );
      if (
        fields.security === "WEP" &&
        !/^(?:[\x20-\x7e]{5}|[\x20-\x7e]{13}|[0-9a-f]{10}|[0-9a-f]{26})$/i.test(
          fields.password,
        )
      )
        throw new Error(
          "Enter a WEP key of 5 or 13 characters, or 10 or 26 hexadecimal digits.",
        );
      return `WIFI:T:${fields.security};S:${qrEscape(fields.ssid)};${fields.security === "nopass" ? "" : `P:${qrEscape(fields.password)};`}H:${fields.hidden ? "true" : "false"};;`;
    }
    case "contact": {
      if (!fields.name.trim()) throw new Error("Enter a contact name.");
      if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
        throw new Error("Enter a valid contact email.");
      if (fields.phone && !/^\+?[0-9][0-9(). -]{1,29}$/.test(fields.phone))
        throw new Error("Enter a valid contact phone number.");
      const name = cardEscape(fields.name.trim());
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${name}`,
        `N:${name};;;;`,
        ...(fields.phone ? [`TEL;TYPE=CELL:${fields.phone}`] : []),
        ...(fields.email ? [`EMAIL:${cardEscape(fields.email)}`] : []),
        ...(fields.company ? [`ORG:${cardEscape(fields.company)}`] : []),
        "END:VCARD",
      ];
      return lines.join("\r\n") + "\r\n";
    }
  }
}

export function qrSvg(
  path: string,
  dimension: number,
  pixels: number,
  foreground: string,
  background: string,
) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}" viewBox="0 0 ${dimension} ${dimension}" shape-rendering="crispEdges"><path fill="${background}" d="M0 0h${dimension}v${dimension}H0z"/><path fill="${foreground}" d="${path}"/></svg>`;
}
