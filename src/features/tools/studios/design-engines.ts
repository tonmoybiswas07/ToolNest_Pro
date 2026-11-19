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
