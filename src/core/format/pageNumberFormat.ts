/**
 * Page-number `\*` number-format switches for PAGE/NUMPAGES fields.
 *
 * Mirrors WordCraft's `NUMBER_FORMATS` (dialogs_insert::field.rs): the switch
 * value is case-sensitive in OOXML (`\* roman` vs `\* ROMAN`), so the format
 * id and its serialized switch are identical. Decimal is the default when no
 * switch (or "decimal") is present. The actual glyphs come from the shared
 * `numberFormat.ts` service together with lists, notes and STYLEREF.
 */
import type { PageNumberFormat } from "@/core/model.js";
import type { NumberFormatToken } from "@/ooxml/word/numberFormat.js";
import {
  fieldSwitchToNumberFormat,
  formatNumberValue,
  numberFormatToFieldSwitch,
} from "@/core/format/numberFormat.js";

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

const FORMAT_TO_TOKEN: Record<PageNumberFormat, NumberFormatToken> = {
  decimal: "decimal",
  roman: "lowerRoman",
  ROMAN: "upperRoman",
  alphabetic: "lowerLetter",
  ALPHABETIC: "upperLetter",
  Ordinal: "ordinal",
};

const TOKEN_TO_FORMAT = new Map<NumberFormatToken, PageNumberFormat>(
  (Object.keys(FORMAT_TO_TOKEN) as PageNumberFormat[]).map((id) => [
    FORMAT_TO_TOKEN[id],
    id,
  ]),
);

/** The `\*` switch emitted for a format. Absent for decimal. */
export function pageNumberFormatToSwitch(
  format: PageNumberFormat | undefined,
): string | undefined {
  return format
    ? numberFormatToFieldSwitch(FORMAT_TO_TOKEN[format])
    : undefined;
}

/** Recover a format from a `\*` switch value (case-sensitive), if recognized. */
export function pageNumberFormatFromSwitch(
  switchValue: string | undefined,
): PageNumberFormat | undefined {
  // Word authors both `Arabic` and `ARABIC`; both are decimal and carry no
  // visual transformation, unlike the case-sensitive roman/alphabetic forms.
  if (!switchValue) return undefined;
  if (switchValue.toUpperCase() === "ARABIC") return "decimal";
  const token = fieldSwitchToNumberFormat(switchValue);
  return token ? TOKEN_TO_FORMAT.get(token) : undefined;
}

/** Convert a page number to its displayed form under the given format. */
export function formatPageNumber(
  value: number,
  format: PageNumberFormat | undefined,
): string {
  // `\* Ordinal` is a fixed English field switch, not a document-language
  // format; the other forms are locale-independent glyph systems.
  return formatNumberValue(
    value,
    format ? FORMAT_TO_TOKEN[format] : "decimal",
    "en-US",
  );
}

/** Section w:pgNumType/@w:fmt is ST_NumberFormat, not a PAGE field
 * general-format switch. Qualify only bounded, deterministic labels.
 * WordprocessingML letter numbering repeats the same glyph after Z
 * (AA, BB, ...), unlike the legacy alphabetic field formatter.
 */
export function formatSectionPageLabel(
  value: number,
  format: string | undefined,
): number | string | undefined {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000_000)
    return undefined;
  switch (format) {
    case undefined:
    case "decimal":
      return value;
    case "decimalZero":
      return formatNumberValue(value, "decimalZero", "en-US");
    case "upperRoman":
    case "lowerRoman":
      return value <= 3999
        ? formatNumberValue(value, format, "en-US")
        : undefined;
    case "upperLetter":
    case "lowerLetter": {
      if (value > 26 * 128) return undefined;
      const base = format === "upperLetter" ? 65 : 97;
      return String.fromCharCode(base + ((value - 1) % 26)).repeat(
        Math.ceil(value / 26),
      );
    }
    default:
      return undefined;
  }
}

/** Validate both legacy numeric resolvers and bounded formatted labels. */
export function isValidTocPageLabel(value: number | string): boolean {
  return typeof value === "number"
    ? Number.isSafeInteger(value) && value >= 1 && value <= 1_000_000
    : typeof value === "string" &&
        value.length <= 128 &&
        /^(?:[A-Z]+|[a-z]+|[0-9]+)$/.test(value) &&
        !/[\r\n]/.test(value);
}
