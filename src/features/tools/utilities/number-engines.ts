export function decimal(raw: string) {
  const input = raw.trim();
  if (
    input.length > 60 ||
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(input)
  )
    throw new Error("Enter a valid number.");
  const value = Number(input);
  if (
    !Number.isFinite(value) ||
    (value === 0 && /[1-9]/.test(input.split(/e/i)[0]))
  ) {
    throw new Error("The number is outside the supported range.");
  }
  return value;
}

export const units = {
  Length: {
    Millimeter: 0.001,
    Centimeter: 0.01,
    Meter: 1,
    Kilometer: 1000,
    Inch: 0.0254,
    Foot: 0.3048,
    Yard: 0.9144,
    Mile: 1609.344,
  },
  Area: {
    "Square centimeter": 0.0001,
    "Square meter": 1,
    "Square kilometer": 1e6,
    Hectare: 1e4,
    "Square inch": 0.0254 ** 2,
    "Square foot": 0.3048 ** 2,
    Acre: 43560 * 0.3048 ** 2,
  },
  Volume: {
    Milliliter: 0.001,
    Liter: 1,
    "Cubic meter": 1000,
    "US liquid gallon": 3.785411784,
    "US fluid ounce": 3.785411784 / 128,
    "Imperial gallon": 4.54609,
    "Imperial fluid ounce": 4.54609 / 160,
  },
  Mass: {
    Milligram: 0.000001,
    Gram: 0.001,
    Kilogram: 1,
    "Metric tonne": 1000,
    "Ounce (avoirdupois)": 0.45359237 / 16,
    Pound: 0.45359237,
  },
  Speed: {
    "Meters per second": 1,
    "Kilometers per hour": 1000 / 3600,
    "Miles per hour": 1609.344 / 3600,
    "Feet per second": 0.3048,
    Knot: 1852 / 3600,
  },
  Temperature: { Celsius: 1, Fahrenheit: 1, Kelvin: 1 },
  "Digital storage": {
    Bit: 0.125,
    Byte: 1,
    Kilobyte: 1000,
    Kibibyte: 1024,
    Megabyte: 1e6,
    Mebibyte: 1024 ** 2,
    Gigabyte: 1e9,
    Gibibyte: 1024 ** 3,
    Terabyte: 1e12,
    Tebibyte: 1024 ** 4,
  },
};
export type UnitCategory = keyof typeof units;

export function unitConversion(
  value: number,
  category: UnitCategory,
  from: string,
  to: string,
) {
  const factors: Record<string, number> = units[category];
  if (!factors || !Object.hasOwn(factors, from) || !Object.hasOwn(factors, to))
    throw new Error("Choose two units in the same category.");
  if (category === "Temperature") {
    const kelvin =
      from === "Celsius"
        ? value + 273.15
        : from === "Fahrenheit"
          ? (value + 459.67) / 1.8
          : value;
    if (kelvin < 0)
      throw new Error("Temperature cannot be below absolute zero.");
    return checked(
      from === to
        ? value
        : to === "Celsius"
          ? kelvin - 273.15
          : to === "Fahrenheit"
            ? kelvin * 1.8 - 459.67
            : kelvin,
    );
  }
  if (category === "Digital storage" && value < 0)
    throw new Error("Digital storage cannot be negative.");
  const result = value * (factors[from] / factors[to]);
  if (result === 0 && value !== 0)
    throw new Error("The result is too small to represent.");
  return checked(result);
}

function checked(value: number) {
  if (!Number.isFinite(value))
    throw new Error("The result is outside the supported range.");
  return Object.is(value, -0) ? 0 : value;
}

export function formatNumber(value: number, precision: number) {
  if (!Number.isInteger(precision) || precision < 1 || precision > 15)
    throw new Error("Choose 1–15 significant digits.");
  const rounded = Number(value.toPrecision(precision));
  return rounded === Infinity ||
    rounded === -Infinity ||
    (rounded === 0 && value !== 0)
    ? value.toPrecision(precision)
    : String(rounded);
}

export const percentModes = {
  of: {
    label: "X% of Y",
    first: "Percentage (X)",
    second: "Value (Y)",
    formula: "(X ÷ 100) × Y",
  },
  share: {
    label: "X is what percent of Y?",
    first: "Part (X)",
    second: "Whole (Y)",
    formula: "(X ÷ Y) × 100",
  },
  delta: {
    label: "Percentage increase or decrease",
    first: "Original (X)",
    second: "New value (Y)",
    formula: "((Y − X) ÷ X) × 100",
  },
  apply: {
    label: "Apply a percentage change",
    first: "Original (X)",
    second: "Signed change % (Y)",
    formula: "X × (1 + Y ÷ 100)",
  },
  reverse: {
    label: "Reverse a percentage change",
    first: "Final value (X)",
    second: "Signed change % (Y)",
    formula: "X ÷ (1 + Y ÷ 100)",
  },
};
export type PercentMode = keyof typeof percentModes;

export function calculatePercentage(mode: PercentMode, x: number, y: number) {
  let result: number;
  switch (mode) {
    case "of":
      result = (x / 100) * y;
      break;
    case "share":
      if (y === 0) throw new Error("The whole must be nonzero.");
      result = (x / y) * 100;
      break;
    case "delta":
      if (x === 0)
        throw new Error("Percentage change requires a nonzero original value.");
      result = ((y - x) / x) * 100;
      break;
    case "apply":
      result = x * (1 + y / 100);
      break;
    case "reverse":
      if (y === -100)
        throw new Error(
          "A −100% change does not determine a unique original value.",
        );
      result = x / (1 + y / 100);
      break;
  }
  return {
    value: checked(result),
    percent: mode === "share" || mode === "delta",
    formula: percentModes[mode].formula,
  };
}
