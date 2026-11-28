/**
 * Deterministic rendering for general Word field formatting switches.
 * All formatters are bounded and fail closed: an unsupported picture or value
 * returns undefined so the caller preserves the cached result instead of
 * inventing a formatted value. No locale other than the explicit en-US
 * numeric mask is implied; date pictures are handled by temporalFieldFormat.
 */
/** `\*` switch names, duplicated here to keep the format layer independent
 * of the OOXML parser (no import cycle). */
export type FormatSwitchName =
  | "MERGEFORMAT"
  | "CHARFORMAT"
  | "Caps"
  | "FirstCap"
  | "Upper"
  | "Lower"
  | "alphabetic"
  | "ALPHABETIC"
  | "Arabic"
  | "ArabicDash"
  | "CardText"
  | "DollarText"
  | "Hex"
  | "OrdText"
  | "Ordinal"
  | "roman"
  | "ROMAN";
import { formatPageNumber } from "./pageNumberFormat.js";

const ones = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const tens = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];
const ordinals: Readonly<Record<string, string>> = {
  one: "first",
  two: "second",
  three: "third",
  four: "fourth",
  five: "fifth",
  six: "sixth",
  seven: "seventh",
  eight: "eighth",
  nine: "ninth",
  ten: "tenth",
  eleven: "eleventh",
  twelve: "twelfth",
  thirteen: "thirteenth",
  fourteen: "fourteenth",
  fifteen: "fifteenth",
  sixteen: "sixteenth",
  seventeen: "seventeenth",
  eighteen: "eighteenth",
  nineteen: "nineteenth",
  twenty: "twentieth",
  thirty: "thirtieth",
  forty: "fortieth",
  fifty: "fiftieth",
  sixty: "sixtieth",
  seventy: "seventieth",
  eighty: "eightieth",
  ninety: "ninetieth",
};

function wordsBelowHundred(value: number): string {
  if (value < 20) return ones[value]!;
  const ten = Math.floor(value / 10),
    rest = value % 10;
  return rest ? `${tens[ten]} ${ones[rest]}` : tens[ten]!;
}

function wordsBelowThousand(value: number): string {
  const hundred = Math.floor(value / 100),
    rest = value % 100;
  if (!hundred) return wordsBelowHundred(rest);
  const head = `${ones[hundred]} hundred`;
  return rest ? `${head} and ${wordsBelowHundred(rest)}` : head;
}

function cardinalWords(value: number): string | undefined {
  if (!Number.isSafeInteger(value) || Math.abs(value) > 999_999)
    return undefined;
  if (value === 0) return "zero";
  const sign = value < 0 ? "minus " : "";
  const absolute = Math.abs(value);
  if (absolute < 1000) return sign + wordsBelowThousand(absolute);
  const thousands = Math.floor(absolute / 1000),
    rest = absolute % 1000;
  const head = `${ones[thousands]} thousand`;
  return rest ? `${sign}${head} ${wordsBelowThousand(rest)}` : sign + head;
}

function ordinalWords(value: number): string | undefined {
  if (!Number.isSafeInteger(value) || value < 0 || value > 99) return undefined;
  const text = wordsBelowHundred(value);
  const parts = text.split(" ");
  const last = parts[parts.length - 1]!;
  const converted = ordinals[last];
  if (!converted) return undefined;
  parts[parts.length - 1] = converted;
  return parts.join(" ");
}

/** `\*` number words. Case-sensitive names match Word's serialized switch. */
export function formatNumberWord(
  value: number,
  name: FormatSwitchName,
): string | undefined {
  if (!Number.isFinite(value) || value > 1_000_000 || value < -1_000_000)
    return undefined;
  switch (name) {
    case "Arabic":
      return Number.isSafeInteger(value) ? String(value) : undefined;
    case "ArabicDash":
      return Number.isSafeInteger(value) ? `- ${value} -` : undefined;
    case "roman":
      return formatPageNumber(value, "roman");
    case "ROMAN":
      return formatPageNumber(value, "ROMAN");
    case "alphabetic":
      return value >= 1 ? formatPageNumber(value, "alphabetic") : undefined;
    case "ALPHABETIC":
      return value >= 1 ? formatPageNumber(value, "ALPHABETIC") : undefined;
    case "Ordinal":
      return Number.isSafeInteger(value) && value >= 1
        ? formatPageNumber(value, "Ordinal")
        : undefined;
    case "Hex":
      return Number.isSafeInteger(value)
        ? Math.abs(Math.trunc(value)).toString(16).toUpperCase()
        : undefined;
    case "CardText":
      return cardinalWords(Math.trunc(value));
    case "OrdText":
      return ordinalWords(value);
    case "DollarText": {
      if (!Number.isFinite(value) || Math.abs(value) > 999_999)
        return undefined;
      const cents = Math.round(Math.abs(value) * 100);
      const major = Math.floor(cents / 100),
        minor = cents % 100;
      const words = cardinalWords(major);
      return words === undefined
        ? undefined
        : `${value < 0 ? "minus " : ""}${words} and ${String(minor).padStart(2, "0")}/100`;
    }
    default:
      return undefined;
  }
}

/** `\*` capitalization words applied after any numeric/date rendering. */
export function formatCapitalization(
  text: string,
  name: FormatSwitchName,
): string {
  if (name === "Upper") return text.toUpperCase();
  if (name === "Lower") return text.toLowerCase();
  if (name === "FirstCap")
    return text ? text[0]!.toUpperCase() + text.slice(1) : text;
  if (name === "Caps")
    return text.replace(
      /(^|\s)(\p{L})/gu,
      (_match, lead: string, letter: string) => lead + letter.toUpperCase(),
    );
  return text;
}

const numericWordNames: ReadonlySet<string> = new Set([
  "alphabetic",
  "ALPHABETIC",
  "Arabic",
  "ArabicDash",
  "CardText",
  "DollarText",
  "Hex",
  "OrdText",
  "Ordinal",
  "roman",
  "ROMAN",
]);

/** Apply a qualified `\*` name to an already resolved result string. */
export function applyStarFormat(
  text: string,
  name: FormatSwitchName,
): string | undefined {
  if (numericWordNames.has(name)) {
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) return undefined;
    const value = Number(text);
    if (!Number.isFinite(value)) return undefined;
    return formatNumberWord(value, name);
  }
  return formatCapitalization(text, name);
}

interface NumericSection {
  prefix: string;
  suffix: string;
  mask: string;
  grouping: boolean;
  percent: boolean;
}

function splitSections(picture: string): string[] | undefined {
  const sections: string[] = [];
  let current = "",
    quoted = false;
  for (let i = 0; i < picture.length; i++) {
    const ch = picture[i]!;
    if (ch === "'") {
      quoted = !quoted;
      current += ch;
      continue;
    }
    if (ch === ";" && !quoted) {
      if (!current) return undefined;
      sections.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (quoted || !current) return undefined;
  sections.push(current);
  return sections.length <= 3 ? sections : undefined;
}

function parseNumericSection(raw: string): NumericSection | undefined {
  let prefix = "",
    suffix = "",
    mask = "",
    seenNumber = false,
    grouping = false,
    percent = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (ch === "'") {
      const end = raw.indexOf("'", i + 1);
      if (end < 0) return undefined;
      const literal = raw.slice(i + 1, end);
      if (seenNumber) suffix += literal;
      else prefix += literal;
      i = end;
      continue;
    }
    if (ch === "0" || ch === "#" || ch === "x") {
      mask += ch;
      seenNumber = true;
      continue;
    }
    if (seenNumber && (ch === "." || ch === ",")) {
      if (ch === ",") grouping = true;
      mask += ch;
      continue;
    }
    if (ch === "%") {
      percent = true;
      if (seenNumber) suffix += ch;
      else prefix += ch;
      continue;
    }
    if (/[\s+\-$€£¥()]/.test(ch)) {
      if (seenNumber) suffix += ch;
      else prefix += ch;
      continue;
    }
    return undefined;
  }
  return { prefix, suffix, mask, grouping, percent };
}

export function supportsNumericPicture(picture: string): boolean {
  if (
    !picture ||
    picture.length > 256 ||
    [...picture].some((ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127)
  )
    return false;
  const sections = splitSections(picture);
  if (!sections) return false;
  const parsed = sections.map((section) => parseNumericSection(section));
  return (
    parsed.every((section) => !!section) &&
    parsed.some((section) => /[0#x]/.test(section!.mask))
  );
}

function formatSection(
  value: number,
  section: NumericSection,
): string | undefined {
  if (!/[0#x]/.test(section.mask)) return section.prefix + section.suffix;
  const dot = section.mask.indexOf(".");
  if (dot >= 0 && section.mask.indexOf(".", dot + 1) >= 0) return undefined;
  const integer = dot < 0 ? section.mask : section.mask.slice(0, dot);
  const fraction = dot < 0 ? "" : section.mask.slice(dot + 1);
  const intZeros = (integer.match(/0/g) ?? []).length;
  const minFraction = (fraction.match(/0/g) ?? []).length;
  const truncated = (fraction.match(/x/g) ?? []).length;
  const maxFraction = (fraction.match(/[0#x]/g) ?? []).length;
  if (
    intZeros > 21 ||
    maxFraction > 20 ||
    maxFraction < minFraction + truncated
  )
    return undefined;
  let magnitude = Math.abs(value);
  if (section.percent) magnitude *= 100;
  if (truncated > 0) {
    const factor = 10 ** truncated;
    magnitude = Math.floor(magnitude * factor) / factor;
  }
  let digits: string;
  try {
    digits = new Intl.NumberFormat("en-US", {
      useGrouping: section.grouping,
      minimumIntegerDigits: intZeros || 1,
      minimumFractionDigits: minFraction,
      maximumFractionDigits: maxFraction,
    }).format(magnitude);
  } catch {
    return undefined;
  }
  return section.prefix + digits + section.suffix;
}

/** `\#` numeric picture. Unrepresentable inputs return undefined. */
export function formatNumericPicture(
  value: number,
  picture: string,
): string | undefined {
  if (!Number.isFinite(value) || !supportsNumericPicture(picture))
    return undefined;
  const sections = splitSections(picture)!;
  const parsed = sections.map((section) => parseNumericSection(section)!);
  let section: NumericSection;
  let negative = false;
  if (parsed.length === 1) {
    // A single section has no explicit negative mask; Word prepends a sign.
    section = parsed[0]!;
    negative = value < 0 && !section.prefix.includes("-");
  } else {
    // Explicit negative (and zero) sections encode their own sign/literals.
    section =
      parsed.length === 2
        ? value < 0
          ? parsed[1]!
          : parsed[0]!
        : value === 0
          ? parsed[2]!
          : value < 0
            ? parsed[1]!
            : parsed[0]!;
  }
  const rendered = formatSection(value, section);
  return rendered === undefined
    ? undefined
    : negative
      ? `-${rendered}`
      : rendered;
}
