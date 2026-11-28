/**
 * `ST_NumberFormat` catalogue (ECMA-376 Part 1 §17.18.41, MS-OI29500 §2.1.5.1).
 *
 * Kept free of DOM/UI so both the OOXML importers and the core formatter can
 * classify a token before deciding whether it is preserved, rendered or
 * editable. An unrecognised token is always classed as `unknown`: callers must
 * keep its source spelling instead of inventing a meaning.
 */
import type { NumberFormatToken } from "@/core/model.js";

export type NumberFormatClass =
  | "counterless"
  | "decimal"
  | "enclosedDecimal"
  | "alphabetic"
  | "roman"
  | "ordinalText"
  | "cardinalText"
  | "chicago"
  | "hex"
  | "ideographic"
  | "alphabeticSequence"
  | "countingSystem"
  | "unknown";

/** Every token recognised by the pinned schema vocabulary. */
export const NUMBER_FORMAT_TOKENS: readonly NumberFormatToken[] = [
  "decimal",
  "decimalZero",
  "decimalFullWidth",
  "decimalFullWidth2",
  "decimalHalfWidth",
  "decimalEnclosedCircle",
  "decimalEnclosedCircleChinese",
  "decimalEnclosedFullstop",
  "decimalEnclosedParen",
  "lowerLetter",
  "upperLetter",
  "lowerRoman",
  "upperRoman",
  "ordinal",
  "ordinalText",
  "cardinalText",
  "chicago",
  "hex",
  "ideographDigital",
  "ideographEnclosedCircle",
  "ideographTraditional",
  "ideographLegal",
  "ideographZodiac",
  "ideographZodiac2",
  "ideographZodiac3",
  "aiueo",
  "aiueoFullWidth",
  "iroha",
  "irohaFullWidth",
  "chosung",
  "ganada",
  "hebrew1",
  "hebrew2",
  "russianLower",
  "russianUpper",
  "koreanDigital",
  "koreanDigital2",
  "japaneseCounting",
  "japaneseDigitalTenThousand",
  "chineseCounting",
  "chineseCountingThousand",
  "chineseLegalSimplified",
  "koreanCounting",
  "koreanLegal",
  "taiwaneseCounting",
  "taiwaneseCountingThousand",
  "taiwaneseDigital",
  "thaiCounting",
  "thaiLetters",
  "thaiNumbers",
  "vietnameseCounting",
  "bullet",
  "none",
];

const COUNTERLESS = new Set<NumberFormatToken>(["bullet", "none"]);
const DECIMAL = new Set<NumberFormatToken>([
  "decimal",
  "decimalZero",
  "decimalFullWidth",
  "decimalFullWidth2",
  "decimalHalfWidth",
]);
const ENCLOSED = new Set<NumberFormatToken>([
  "decimalEnclosedCircle",
  "decimalEnclosedCircleChinese",
  "decimalEnclosedFullstop",
  "decimalEnclosedParen",
]);
const ALPHABETIC = new Set<NumberFormatToken>(["lowerLetter", "upperLetter"]);
const ROMAN = new Set<NumberFormatToken>(["lowerRoman", "upperRoman"]);
const ORDINAL = new Set<NumberFormatToken>(["ordinal", "ordinalText"]);
const CARDINAL = new Set<NumberFormatToken>(["cardinalText"]);
const CHICAGO = new Set<NumberFormatToken>(["chicago"]);
const HEX = new Set<NumberFormatToken>(["hex"]);
const IDEOGRAPHIC = new Set<NumberFormatToken>([
  "ideographDigital",
  "ideographEnclosedCircle",
  "ideographTraditional",
  "ideographLegal",
  "ideographZodiac",
  "ideographZodiac2",
  "ideographZodiac3",
]);
const ALPHABETIC_SEQUENCE = new Set<NumberFormatToken>([
  "aiueo",
  "aiueoFullWidth",
  "iroha",
  "irohaFullWidth",
  "chosung",
  "ganada",
  "hebrew1",
  "hebrew2",
  "russianLower",
  "russianUpper",
]);
const COUNTING = new Set<NumberFormatToken>([
  "koreanDigital",
  "koreanDigital2",
  "japaneseCounting",
  "japaneseDigitalTenThousand",
  "chineseCounting",
  "chineseCountingThousand",
  "chineseLegalSimplified",
  "koreanCounting",
  "koreanLegal",
  "taiwaneseCounting",
  "taiwaneseCountingThousand",
  "taiwaneseDigital",
  "thaiCounting",
  "thaiLetters",
  "thaiNumbers",
  "vietnameseCounting",
]);

export function isKnownNumberFormat(
  token: string | undefined,
): token is NumberFormatToken {
  return (
    token !== undefined &&
    NUMBER_FORMAT_TOKENS.includes(token as NumberFormatToken)
  );
}

export function classifyNumberFormat(
  token: string | undefined,
): NumberFormatClass {
  if (!isKnownNumberFormat(token)) return "unknown";
  if (COUNTERLESS.has(token)) return "counterless";
  if (DECIMAL.has(token)) return "decimal";
  if (ENCLOSED.has(token)) return "enclosedDecimal";
  if (ALPHABETIC.has(token)) return "alphabetic";
  if (ROMAN.has(token)) return "roman";
  if (ORDINAL.has(token)) return "ordinalText";
  if (CARDINAL.has(token)) return "cardinalText";
  if (CHICAGO.has(token)) return "chicago";
  if (HEX.has(token)) return "hex";
  if (IDEOGRAPHIC.has(token)) return "ideographic";
  if (ALPHABETIC_SEQUENCE.has(token)) return "alphabeticSequence";
  if (COUNTING.has(token)) return "countingSystem";
  return "unknown";
}

/** Formats whose glyphs depend on the document language rather than on a rule. */
export function needsLocaleNumberFormat(token: string | undefined): boolean {
  const kind = classifyNumberFormat(token);
  return (
    kind === "ordinalText" || kind === "cardinalText" || kind === "chicago"
  );
}

/**
 * Deterministic here means "same value and same token always render the same
 * label, without consulting a locale or an external oracle". Counting systems
 * are excluded until their rules are sourced from official documentation.
 */
export function isDeterministicNumberFormat(
  token: string | undefined,
): boolean {
  const kind = classifyNumberFormat(token);
  return (
    kind === "decimal" ||
    kind === "enclosedDecimal" ||
    kind === "alphabetic" ||
    kind === "roman" ||
    kind === "hex" ||
    kind === "ideographic" ||
    kind === "alphabeticSequence" ||
    kind === "counterless"
  );
}
