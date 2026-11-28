import { describe, expect, it } from "vitest";
import {
  fieldSwitchToNumberFormat,
  formatNumberValue,
  numberFormatToFieldSwitch,
  registerNumberFormatLocale,
} from "@/core/format/numberFormat.js";
import {
  NUMBER_FORMAT_TOKENS,
  classifyNumberFormat,
  isDeterministicNumberFormat,
} from "@/ooxml/word/numberFormat.js";

const DETERMINISTIC: ReadonlyArray<[string, number, string]> = [
  ["decimal", 1, "1"],
  ["decimal", 27, "27"],
  ["decimalZero", 1, "01"],
  ["decimalZero", 27, "27"],
  ["decimalFullWidth", 12, "１２"],
  ["decimalFullWidth2", 12, "１２"],
  ["decimalHalfWidth", 12, "12"],
  ["decimalEnclosedCircle", 1, "①"],
  ["decimalEnclosedCircle", 20, "⑳"],
  ["decimalEnclosedCircleChinese", 1, "㊀"],
  ["decimalEnclosedFullstop", 1, "⒈"],
  ["decimalEnclosedParen", 1, "⑴"],
  ["lowerLetter", 1, "a"],
  ["lowerLetter", 27, "aa"],
  ["upperLetter", 28, "AB"],
  ["lowerRoman", 4, "iv"],
  ["lowerRoman", 1999, "mcmxcix"],
  ["upperRoman", 4, "IV"],
  ["hex", 10, "A"],
  ["hex", 255, "FF"],
  ["ideographDigital", 1, "一"],
  ["ideographDigital", 10, "十"],
  ["ideographDigital", 21, "二十一"],
  ["ideographZodiac", 1, "子"],
  ["ideographZodiac", 13, "2子"],
  ["aiueo", 1, "イ"],
  ["iroha", 1, "い"],
  ["chosung", 2, "ㄴ"],
  ["ganada", 2, "나"],
  ["hebrew1", 1, "א"],
  ["russianLower", 1, "а"],
  ["russianUpper", 1, "А"],
  ["koreanDigital", 1, "일"],
  ["none", 5, ""],
  ["bullet", 5, ""],
  ["chineseCounting", 5, "5"], // preserved, not rendered
  ["unlistedToken", 5, "5"],
];

describe("formatNumberValue — deterministic formats", () => {
  it.each(DETERMINISTIC)("%s of %i is %s", (format, value, expected) => {
    expect(formatNumberValue(value, format, "pt-BR")).toBe(expected);
  });

  it("keeps decimals outside the bounded roman range", () => {
    expect(formatNumberValue(4000, "upperRoman", "en-US")).toBe("4000");
  });

  it("pads the same way for either locale", () => {
    expect(formatNumberValue(7, "decimalZero", "en-US")).toBe("07");
    expect(formatNumberValue(7, "decimalZero", "pt-BR")).toBe("07");
  });
});

describe("formatNumberValue — locale registry", () => {
  const CASES: ReadonlyArray<[string, number, string, string]> = [
    ["ordinal", 1, "en-US", "1st"],
    ["ordinal", 2, "en-US", "2nd"],
    ["ordinal", 3, "en-US", "3rd"],
    ["ordinal", 11, "en-US", "11th"],
    ["ordinal", 21, "en-US", "21st"],
    ["ordinal", 1, "pt-BR", "1º"],
    ["ordinalText", 1, "en-US", "first"],
    ["ordinalText", 20, "en-US", "twentieth"],
    ["ordinalText", 21, "en-US", "21"],
    ["ordinalText", 1, "pt-BR", "primeiro"],
    ["ordinalText", 20, "pt-BR", "vigésimo"],
    ["cardinalText", 1, "en-US", "one"],
    ["cardinalText", 21, "en-US", "twenty one"],
    ["cardinalText", 100, "en-US", "100"],
    ["cardinalText", 1, "pt-BR", "um"],
    ["cardinalText", 21, "pt-BR", "vinte e um"],
    ["chicago", 1, "en-US", "one"],
    ["chicago", 11, "en-US", "11"],
    ["chicago", 1, "pt-BR", "um"],
  ];
  it.each(CASES)("%s of %i in %s is %s", (format, value, locale, expected) => {
    expect(formatNumberValue(value, format, locale)).toBe(expected);
  });

  it("accepts new locales through the registry without changing the engine", () => {
    registerNumberFormatLocale("zz-TEST", { ordinal: value => `${value}ºz` });
    expect(formatNumberValue(2, "ordinal", "zz-TEST")).toBe("2ºz");
    expect(formatNumberValue(2, "ordinal", "en-US")).toBe("2nd");
  });

  it("falls back deterministically when a locale has no formatter", () => {
    expect(formatNumberValue(2, "ordinalText", "fr-FR")).toBe("2");
  });
});

describe("ST_NumberFormat catalogue", () => {
  it("knows every token it publishes", () => {
    expect(new Set(NUMBER_FORMAT_TOKENS).size).toBe(NUMBER_FORMAT_TOKENS.length);
    for (const token of NUMBER_FORMAT_TOKENS) {
      expect(classifyNumberFormat(token)).not.toBe("unknown");
    }
  });

  it("classifies counting systems as not deterministic", () => {
    expect(classifyNumberFormat("decimalZero")).toBe("decimal");
    expect(classifyNumberFormat("ideographDigital")).toBe("ideographic");
    expect(classifyNumberFormat("chineseCounting")).toBe("countingSystem");
    expect(isDeterministicNumberFormat("chineseCounting")).toBe(false);
    expect(isDeterministicNumberFormat("decimalEnclosedCircle")).toBe(true);
    expect(classifyNumberFormat("bogus")).toBe("unknown");
  });
});

describe("field switch mapping", () => {
  it("round-trips case-sensitive forms and treats ARABIC as decimal", () => {
    for (const token of [
      "lowerRoman",
      "upperRoman",
      "lowerLetter",
      "upperLetter",
      "ordinal",
    ] as const) {
      expect(fieldSwitchToNumberFormat(numberFormatToFieldSwitch(token))).toBe(token);
    }
    expect(fieldSwitchToNumberFormat("ARABIC")).toBe("decimal");
    expect(numberFormatToFieldSwitch("decimal")).toBeUndefined();
    expect(fieldSwitchToNumberFormat("unknown")).toBeUndefined();
  });
});
