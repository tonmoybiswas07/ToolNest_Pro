export type RGB = [number, number, number];
export type ColorStop = { color: string; position: number };

export function rgbFromHex(value: string): RGB {
  const hex = value.replace(/^#/, "");
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex))
    throw new Error("Enter a 3- or 6-digit HEX color.");
  const full =
    hex.length === 3 ? [...hex].map((char) => char.repeat(2)).join("") : hex;
  return [0, 2, 4].map((offset) =>
    parseInt(full.slice(offset, offset + 2), 16),
  ) as RGB;
}

export function hexFromRgb(value: RGB) {
  return (
    "#" +
    value
      .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function hslFromRgb(rgb: RGB) {
  const [r, g, b] = rgb.map((channel) => channel / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const light = (max + min) / 2;
  const saturation = delta ? delta / (1 - Math.abs(2 * light - 1)) : 0;
  const hue = !delta
    ? 0
    : max === r
      ? (g - b) / delta
      : max === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4;
  return { h: (hue * 60 + 360) % 360, s: saturation * 100, l: light * 100 };
}

function luminance(rgb: RGB) {
  const [r, g, b] = rgb.map((channel) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

export function contrast(a: RGB, b: RGB) {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function colorScale(base: RGB) {
  const stops = [
    [50, 0.95],
    [100, 0.85],
    [200, 0.65],
    [300, 0.45],
    [400, 0.2],
    [500, 0],
    [600, -0.16],
    [700, -0.32],
    [800, -0.5],
    [900, -0.68],
    [950, -0.82],
  ];
  return stops.map(([level, mix]) => {
    const endpoint = mix >= 0 ? 255 : 0;
    const rgb = base.map((channel) =>
      Math.round(channel + (endpoint - channel) * Math.abs(mix)),
    ) as RGB;
    const hsl = hslFromRgb(rgb);
    return {
      level,
      hex: hexFromRgb(rgb),
      rgb: `rgb(${rgb.join(", ")})`,
      hsl: `hsl(${hsl.h.toFixed(1)} ${hsl.s.toFixed(1)}% ${hsl.l.toFixed(1)}%)`,
      white: contrast(rgb, [255, 255, 255]),
      black: contrast(rgb, [0, 0, 0]),
    };
  });
}

export function gradientCss(
  kind: "linear" | "radial",
  angle: number,
  stops: ColorStop[],
) {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const colors = sorted
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(", ");
  return kind === "linear"
    ? `linear-gradient(${angle}deg, ${colors})`
    : `radial-gradient(circle, ${colors})`;
}

export function glassStyles(
  color: string,
  opacity: number,
  blur: number,
  border: number,
  radius: number,
  shadow: number,
) {
  const [r, g, b] = rgbFromHex(color);
  return {
    background: `rgba(${r}, ${g}, ${b}, ${opacity / 100})`,
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    border: `1px solid rgba(255, 255, 255, ${border / 100})`,
    borderRadius: `${radius}px`,
    boxShadow: `0 12px 32px rgba(0, 0, 0, ${shadow / 100})`,
  };
}

export function rgbFromHsl(hue: number, saturation: number, lightness: number): RGB {
  const h = ((hue % 360 + 360) % 360) / 60;
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const secondary = chroma * (1 - Math.abs(h % 2 - 1));
  const channels = [[chroma, secondary, 0], [secondary, chroma, 0], [0, chroma, secondary],
    [0, secondary, chroma], [secondary, 0, chroma], [chroma, 0, secondary]];
  const shift = l - chroma / 2;
  return channels[Math.floor(h)].map(channel => Math.min(255, Math.max(0, (channel + shift) * 255))) as RGB;
}

function cssChannel(value: string, max: number, percentOnly = false) {
  const match = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(%)?$/.exec(value);
  if (!match || (percentOnly && !match[2])) throw new Error("Enter valid numeric color channels.");
  const number = Number(match[1]);
  const limit = match[2] ? 100 : max;
  if (number < 0 || number > limit) throw new Error("A color channel is outside its valid range.");
  return match[2] ? number / 100 * max : number;
}

export function parseCssColor(value: string): { rgb: RGB; alpha: number } {
  const input = value.trim();
  if (input.length > 120) throw new Error("Use a color value of 120 characters or fewer.");
  if (/^#?[\da-f]{3,8}$/i.test(input)) {
    const hex = input.replace(/^#/, "");
    if (![3, 4, 6, 8].includes(hex.length)) throw new Error("Use 3, 4, 6, or 8 hexadecimal digits.");
    const short = hex.length <= 4;
    const rgb = rgbFromHex(hex.slice(0, short ? 3 : 6));
    const suffix = hex.slice(short ? 3 : 6);
    return { rgb, alpha: suffix ? parseInt(short ? suffix.repeat(2) : suffix, 16) / 255 : 1 };
  }
  const fn = /^(rgb|rgba|hsl|hsla)\(([^()]+)\)$/i.exec(input);
  if (!fn) throw new Error("Enter HEX, rgb(), rgba(), hsl(), or hsla().");
  const body = fn[2].trim();
  const pieces = body.split("/");
  const comma = body.includes(",");
  if (pieces.length > 2 || (comma && pieces.length > 1)) throw new Error("Use commas or space-separated CSS channels with a slash before alpha.");
  const parts = comma ? pieces[0].split(",").map(part => part.trim()) : pieces[0].trim().split(/\s+/);
  const alpha = comma && parts.length === 4 ? cssChannel(parts.pop()!, 1) : pieces.length === 2 ? cssChannel(pieces[1].trim(), 1) : 1;
  if (parts.length !== 3) throw new Error("Enter three color channels.");
  if (fn[1].toLowerCase().startsWith("rgb")) {
    return { rgb: [cssChannel(parts[0], 255), cssChannel(parts[1], 255), cssChannel(parts[2], 255)], alpha };
  }
  const hue = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(deg|turn|rad|grad)?$/i.exec(parts[0]);
  if (!hue || !Number.isFinite(Number(hue[1]))) throw new Error("Enter a valid hue angle.");
  const factors = { deg: 1, turn: 360, rad: 180 / Math.PI, grad: 0.9 };
  const angle = Number(hue[1]) * factors[(hue[2]?.toLowerCase() ?? "deg") as keyof typeof factors];
  if (!Number.isFinite(angle)) throw new Error("The hue angle is too large.");
  return { rgb: rgbFromHsl(angle, cssChannel(parts[1], 100, true), cssChannel(parts[2], 100, true)), alpha };
}

const displayChannel = (value: number) => Number(value.toFixed(5));

export function convertColor(input: string) {
  const { rgb, alpha } = parseCssColor(input);
  const hsl = hslFromRgb(rgb);
  const opacity = alpha === 1 ? "" : ` / ${displayChannel(alpha)}`;
  return {
    hex: hexFromRgb(rgb) + (alpha === 1 ? "" : Math.round(alpha * 255).toString(16).padStart(2, "0")),
    rgb: `rgb(${rgb.map(displayChannel).join(" ")}${opacity})`,
    hsl: `hsl(${displayChannel(hsl.h)} ${displayChannel(hsl.s)}% ${displayChannel(hsl.l)}%${opacity})`,
  };
}
