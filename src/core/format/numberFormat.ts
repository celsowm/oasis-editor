/**
 * The single number-formatting service for list labels, page fields, note
 * markers and sequence fields.
 *
 * Formatters are pure and deterministic. Locale-dependent forms come from a
 * registry so a new language can be added without touching the engine. A token
 * without a registered formatter falls back to decimal while callers keep the
 * original OOXML token for export — preserving a format is not the same as
 * rendering it.
 */
import type { NumberFormatToken } from "@/core/model.js";
import { isKnownNumberFormat } from "@/ooxml/word/numberFormat.js";

export interface LocaleNumberFormatters {
  ordinal?(value: number): string | null;
  cardinal?(value: number): string | null;
  ordinalText?(value: number): string | null;
  chicago?(value: number): string | null;
}

const formattersByLocale = new Map<string, LocaleNumberFormatters>();

function normalizeLocale(locale: string | undefined): string {
  return (locale ?? "").trim().replace(/_/g, "-").toLowerCase();
}

function lookupFormatters(locale: string | undefined): LocaleNumberFormatters {
  const normalized = normalizeLocale(locale);
  const exact = formattersByLocale.get(normalized);
  if (exact) return exact;
  const language = normalized.split("-")[0];
  if (language && formattersByLocale.has(language)) {
    return formattersByLocale.get(language)!;
  }
  return {};
}

/** Register (or extend) the textual formatters for a locale. */
export function registerNumberFormatLocale(
  locale: string,
  formatters: LocaleNumberFormatters,
): void {
  const key = normalizeLocale(locale);
  if (!key) return;
  formattersByLocale.set(key, {
    ...formattersByLocale.get(key),
    ...formatters,
  });
}

const EN_ONES = [
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
const EN_TENS = [
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
const EN_ORDINAL_WORDS = [
  "zeroth",
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
  "thirteenth",
  "fourteenth",
  "fifteenth",
  "sixteenth",
  "seventeenth",
  "eighteenth",
  "nineteenth",
  "twentieth",
];
const PT_ONES = [
  "zero",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
  "vinte",
];
const PT_TENS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];
const PT_ORDINAL_WORDS = [
  "zero",
  "primeiro",
  "segundo",
  "terceiro",
  "quarto",
  "quinto",
  "sexto",
  "sétimo",
  "oitavo",
  "nono",
  "décimo",
  "décimo primeiro",
  "décimo segundo",
  "décimo terceiro",
  "décimo quarto",
  "décimo quinto",
  "décimo sexto",
  "décimo sétimo",
  "décimo oitavo",
  "décimo nono",
  "vigésimo",
];

function enOrdinal(value: number): string {
  const abs = Math.abs(value);
  const lastTwo = abs % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${value}th`;
  switch (abs % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function enCardinal(value: number): string | null {
  if (value < 0 || value > 99) return null;
  if (value < 20) return EN_ONES[value]!;
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return ones === 0 ? EN_TENS[tens]! : `${EN_TENS[tens]} ${EN_ONES[ones]}`;
}

function ptCardinal(value: number): string | null {
  if (value < 0 || value > 99) return null;
  if (value < 20) return PT_ONES[value]!;
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return ones === 0 ? PT_TENS[tens]! : `${PT_TENS[tens]} e ${PT_ONES[ones]}`;
}

function enOrdinalText(value: number): string | null {
  if (value < 1 || value > 20) return null;
  return EN_ORDINAL_WORDS[value]!;
}

function ptOrdinalText(value: number): string | null {
  if (value < 1 || value > 20) return null;
  return PT_ORDINAL_WORDS[value]!;
}

registerNumberFormatLocale("en-US", {
  ordinal: enOrdinal,
  cardinal: enCardinal,
  ordinalText: enOrdinalText,
  chicago: (value) =>
    value >= 1 && value <= 10 ? enCardinal(value) : String(value),
});
registerNumberFormatLocale("pt-BR", {
  ordinal: (value) => `${value}º`,
  cardinal: ptCardinal,
  ordinalText: ptOrdinalText,
  chicago: (value) =>
    value >= 1 && value <= 10 ? ptCardinal(value) : String(value),
});
registerNumberFormatLocale("pt", {
  ordinal: (value) => `${value}º`,
  cardinal: ptCardinal,
  ordinalText: ptOrdinalText,
  chicago: (value) =>
    value >= 1 && value <= 10 ? ptCardinal(value) : String(value),
});
registerNumberFormatLocale("en", {
  ordinal: enOrdinal,
  cardinal: enCardinal,
  ordinalText: enOrdinalText,
  chicago: (value) =>
    value >= 1 && value <= 10 ? enCardinal(value) : String(value),
});

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

function toRoman(value: number): string {
  if (value <= 0 || value >= 4000) return String(value);
  let remaining = value;
  let result = "";
  for (const [amount, glyph] of ROMAN_SYMBOLS) {
    while (remaining >= amount) {
      result += glyph;
      remaining -= amount;
    }
  }
  return result;
}

function toAlpha(value: number): string {
  if (value <= 0) return String(value);
  let remaining = value;
  let result = "";
  while (remaining > 0) {
    result = String.fromCharCode(65 + ((remaining - 1) % 26)) + result;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return result;
}

const FULL_WIDTH_DIGITS = "０１２３４５６７８９";
const AIUEO = Array.from(
  "イロハニホヘトチリヌルヲワカヨタレソツネナラムウヰノオクヤマケフコエテアサキユメミシヱヒモセスン",
);
const IROHA = Array.from(
  "いろはにほへとちりぬるをわかよたれそつねならむうゐのおくやまけふこえてあさきゆめみしゑひもせすん",
);
const CHOSUNG = Array.from("ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ");
const GANADA = Array.from("가나다라마바사아자차카타파하");
const HEBREW = Array.from("אבגדהוזחטיכלמנסעפצקרשת");
const RUSSIAN_LOWER = Array.from("абвгдежзийклмнопрстуфхцчшщъыьэюя");
const ZODIAC = Array.from("子丑寅卯辰巳午未申酉戌亥");
const IDEOGRAPH_DIGITS = Array.from("〇一二三四五六七八九");
const IDEOGRAPH_TRADITIONAL = Array.from("壱弐参肆伍陸漆捌玖");
const IDEOGRAPH_LEGAL = Array.from("壹貳參肆伍陸柒捌玖");
const KOREAN_DIGITS = Array.from("일이삼사오육칠팔구십");

function fromSequence(sequence: readonly string[], value: number): string {
  if (value <= 0 || sequence.length === 0) return String(value);
  const index = (value - 1) % sequence.length;
  const cycle = Math.floor((value - 1) / sequence.length);
  return `${cycle > 0 ? cycle + 1 : ""}${sequence[index]!}`;
}

function chineseNumeral(value: number): string {
  if (value <= 0) return String(value);
  if (value < 10) return IDEOGRAPH_DIGITS[value]!;
  if (value === 10) return "十";
  if (value < 20) return `十${IDEOGRAPH_DIGITS[value - 10]!}`;
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return `${IDEOGRAPH_DIGITS[tens]}十${ones ? IDEOGRAPH_DIGITS[ones] : ""}`;
  }
  // Values above 99 need the full myriad-unit grammar; they are Tier C and
  // deliberately fall back instead of emitting a misleading short label.
  return String(value);
}

function enclosed(value: number, start: number, last: number): string {
  return value >= 1 && value <= last
    ? String.fromCodePoint(start + value - 1)
    : String(value);
}

/** Render one value under one ST_NumberFormat token. Never returns null. */
export function formatNumberValue(
  value: number,
  token: string | undefined,
  locale?: string,
): string {
  const numeric = Number.isFinite(value) ? Math.floor(value) : Number(value);
  if (!isKnownNumberFormat(token)) return String(numeric);
  const formatters = lookupFormatters(locale);

  switch (token) {
    case "none":
      return "";
    case "decimal":
    case "decimalHalfWidth":
      return String(numeric);
    case "decimalZero":
      return String(numeric).padStart(2, "0");
    case "decimalFullWidth":
    case "decimalFullWidth2":
      return String(numeric).replace(
        /\d/g,
        (digit) => FULL_WIDTH_DIGITS[Number(digit)]!,
      );
    case "decimalEnclosedCircle":
      return enclosed(numeric, 0x2460, 20);
    case "decimalEnclosedCircleChinese":
      return enclosed(numeric, 0x3280, 10);
    case "decimalEnclosedFullstop":
      return enclosed(numeric, 0x2488, 20);
    case "decimalEnclosedParen":
      return enclosed(numeric, 0x2474, 20);
    case "hex":
      return numeric > 0 ? numeric.toString(16).toUpperCase() : String(numeric);
    case "lowerRoman":
      return toRoman(numeric).toLowerCase();
    case "upperRoman":
      return toRoman(numeric);
    case "lowerLetter":
      return toAlpha(numeric).toLowerCase();
    case "upperLetter":
      return toAlpha(numeric);
    case "ordinal":
      return formatters.ordinal?.(numeric) ?? enOrdinal(numeric);
    case "ordinalText":
      return formatters.ordinalText?.(numeric) ?? String(numeric);
    case "cardinalText":
      return formatters.cardinal?.(numeric) ?? String(numeric);
    case "chicago":
      return formatters.chicago?.(numeric) ?? String(numeric);
    case "ideographDigital":
      return chineseNumeral(numeric);
    case "ideographEnclosedCircle":
      return enclosed(numeric, 0x3280, 10);
    case "ideographTraditional":
      return numeric > 0 && numeric < 10
        ? IDEOGRAPH_TRADITIONAL[numeric]!
        : chineseNumeral(numeric);
    case "ideographLegal":
      return numeric > 0 && numeric < 10
        ? IDEOGRAPH_LEGAL[numeric]!
        : chineseNumeral(numeric);
    case "ideographZodiac":
    case "ideographZodiac2":
    case "ideographZodiac3":
      return fromSequence(ZODIAC, numeric);
    case "aiueo":
    case "aiueoFullWidth":
      return fromSequence(AIUEO, numeric);
    case "iroha":
    case "irohaFullWidth":
      return fromSequence(IROHA, numeric);
    case "chosung":
      return fromSequence(CHOSUNG, numeric);
    case "ganada":
      return fromSequence(GANADA, numeric);
    case "hebrew1":
    case "hebrew2":
      return fromSequence(HEBREW, numeric);
    case "russianLower":
      return fromSequence(RUSSIAN_LOWER, numeric);
    case "russianUpper":
      return fromSequence(RUSSIAN_LOWER, numeric).toUpperCase();
    case "koreanDigital":
    case "koreanDigital2":
      return fromSequence(KOREAN_DIGITS, numeric);
    case "bullet":
      return "";
    default:
      // Remaining counting systems have no documented rule in this codebase.
      // Preserve the token on export via ooxmlNumbering; render decimal.
      return String(numeric);
  }
}

/** `\*` field switch for a format token (absent means decimal). */
export function numberFormatToFieldSwitch(
  token: NumberFormatToken | undefined,
): string | undefined {
  switch (token) {
    case "lowerRoman":
      return "roman";
    case "upperRoman":
      return "ROMAN";
    case "lowerLetter":
      return "alphabetic";
    case "upperLetter":
      return "ALPHABETIC";
    case "ordinal":
      return "Ordinal";
    default:
      return undefined;
  }
}

/** Parse a `\*` switch, preserving the case-sensitive roman/alphabetic forms. */
export function fieldSwitchToNumberFormat(
  switchValue: string | undefined,
): NumberFormatToken | undefined {
  if (!switchValue) return undefined;
  if (switchValue.toUpperCase() === "ARABIC") return "decimal";
  switch (switchValue) {
    case "roman":
      return "lowerRoman";
    case "ROMAN":
      return "upperRoman";
    case "alphabetic":
      return "lowerLetter";
    case "ALPHABETIC":
      return "upperLetter";
    case "Ordinal":
      return "ordinal";
    default:
      return undefined;
  }
}
