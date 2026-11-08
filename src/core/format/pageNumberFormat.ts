/**
 * Page-number `\*` number-format switches for PAGE/NUMPAGES fields.
 *
 * Mirrors WordCraft's `NUMBER_FORMATS` (dialogs_insert::field.rs): the switch
 * value is case-sensitive in OOXML (`\* roman` vs `\* ROMAN`), so the format
 * id and its serialized switch are identical. Decimal is the default when no
 * switch (or "decimal") is present.
 */
import type { PageNumberFormat } from "@/core/model.js";

export const PAGE_NUMBER_FORMATS: ReadonlyArray<{
  id: PageNumberFormat;
  label: string;
}> = [
  { id: "decimal", label: "1, 2, 3, …" },
  { id: "roman", label: "i, ii, iii, …" },
  { id: "ROMAN", label: "I, II, III, …" },
  { id: "alphabetic", label: "a, b, c, …" },
  { id: "ALPHABETIC", label: "A, B, C, …" },
  { id: "Ordinal", label: "1st, 2nd, 3rd, …" },
];

/** The `\*` switch emitted for a format. Absent for decimal. */
export function pageNumberFormatToSwitch(
  format: PageNumberFormat | undefined,
): string | undefined {
  if (!format || format === "decimal") {
    return undefined;
  }
  return format;
}

/** Recover a format from a `\*` switch value (case-sensitive), if recognized. */
export function pageNumberFormatFromSwitch(
  switchValue: string | undefined,
): PageNumberFormat | undefined {
  if (!switchValue) {
    return undefined;
  }
  const id = PAGE_NUMBER_FORMATS.find(
    (entry): boolean => entry.id === switchValue,
  )?.id;
  return id;
}

/** Convert a page number to its displayed form under the given format. */
export function formatPageNumber(
  value: number,
  format: PageNumberFormat | undefined,
): string {
  switch (format) {
    case "roman":
      return toRoman(value, false);
    case "ROMAN":
      return toRoman(value, true);
    case "alphabetic":
      return toAlpha(value, false);
    case "ALPHABETIC":
      return toAlpha(value, true);
    case "Ordinal":
      return toOrdinal(value);
    default:
      return String(value);
  }
}

const ROMAN_SYMBOLS: ReadonlyArray<[number, string]> = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

function toRoman(value: number, upper: boolean): string {
  if (value <= 0) {
    return String(value);
  }
  let remaining = Math.floor(value);
  let result = "";
  for (const [numeral, glyph] of ROMAN_SYMBOLS) {
    while (remaining >= numeral) {
      result += glyph;
      remaining -= numeral;
    }
  }
  return upper ? result : result.toLowerCase();
}

function toAlpha(value: number, upper: boolean): string {
  if (value <= 0) {
    return String(value);
  }
  const base = upper ? 65 : 97; // 'A' or 'a'
  let result = "";
  let remaining = value;
  while (remaining > 0) {
    remaining -= 1;
    result = String.fromCharCode(base + (remaining % 26)) + result;
    remaining = Math.floor(remaining / 26);
  }
  return result;
}

function toOrdinal(value: number): string {
  const n = Math.floor(value);
  const abs = Math.abs(n);
  const lastTwo = abs % 100;
  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${n}th`;
  }
  const lastDigit = abs % 10;
  const suffix =
    lastDigit === 1
      ? "st"
      : lastDigit === 2
        ? "nd"
        : lastDigit === 3
          ? "rd"
          : "th";
  return `${n}${suffix}`;
}
