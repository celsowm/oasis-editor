import { describe, expect, it } from "vitest";
import { parseFieldInstruction } from "@/ooxml/word/fieldInstruction.js";
import {
  FIELD_FORMAT_SWITCH_PROFILES,
  parseFieldFormatSwitches,
  parseFormatSwitchesFromTokens,
  serializeFieldFormatSwitches,
} from "@/ooxml/word/fieldFormatSwitches.js";
import {
  applyStarFormat,
  formatCapitalization,
  formatNumberWord,
  formatNumericPicture,
  supportsNumericPicture,
} from "@/core/format/fieldResultFormat.js";

const parse = (raw: string) => {
  const parsed = parseFieldInstruction(raw);
  if (parsed.error) throw new Error(`unexpected lexer error: ${parsed.error}`);
  const result = parseFieldFormatSwitches(parsed.tokens.slice(1), parsed.command);
  if (!result) throw new Error("unqualified formatting switches");
  return result;
};

describe("general formatting switch grammar", () => {
  it("extracts MERGEFORMAT, CHARFORMAT, pictures and leaves family switches", () => {
    const result = parse(String.raw` REF Target \b "before" \* MERGEFORMAT \# "$#,##0.00" \h `);
    expect(result.switches).toEqual({ mergeFormat: true, numericPicture: "$#,##0.00" });
    expect(result.remaining.map(t => t.value)).toEqual(["Target", "b", "before", "h"]);
    expect(serializeFieldFormatSwitches(result.switches)).toBe(' \\* MERGEFORMAT \\# "$#,##0.00"');
  });

  it("supports case-sensitive number words and PAGE-only ArabicDash", () => {
    expect(parse(" PAGE \\* roman ").switches.capitalization).toBe("roman");
    expect(parse(" PAGE \\* ArabicDash ").switches.capitalization).toBe("ArabicDash");
    expect(parseFormatSwitchesFromTokens(
      parseFieldInstruction(" NUMPAGES \\* ArabicDash ").tokens.slice(1),
      FIELD_FORMAT_SWITCH_PROFILES["NUMPAGES"]!,
    )).toBeUndefined();
    expect(parse(" DATE \\@ \"yyyy-MM-dd\" ").switches.datePicture).toBe("yyyy-MM-dd");
    expect(parse(" PAGE \\* Upper ").switches.capitalization).toBe("Upper");
  });

  it("fails closed on duplicates, bad arguments and unsupported pictures", () => {
    for (const raw of [
      " PAGE \\* roman \\* ROMAN ",
      " PAGE \\* Unknown ",
      " DATE \\@ \"not a picture\" ",
      " REF X \\# \"\" ",
      " REF X \\# \"0.00",
    ]) {
      expect(() => parse(raw)).toThrow();
    }
    expect(() => parse(" IF \"a\" = \"a\" \\* MERGEFORMAT \\* MERGEFORMAT ")).toThrow();
  });

  it("never promotes switches for commands without a profile", () => {
    const parsed = parseFieldInstruction(String.raw` TA \l "Case" \* MERGEFORMAT `);
    const result = parseFieldFormatSwitches(parsed.tokens.slice(1), parsed.command)!;
    expect(result.switches).toEqual({});
    expect(result.remaining.map(t => t.value)).toEqual(["l", "Case", "*", "MERGEFORMAT"]);
  });
});

describe("bounded result formatting", () => {
  it("formats numeric pictures deterministically", () => {
    expect(formatNumericPicture(1234.5, "$#,##0.00")).toBe("$1,234.50");
    expect(formatNumericPicture(7, "000")).toBe("007");
    expect(formatNumericPicture(0.125, "0.0%")).toBe("12.5%");
    expect(formatNumericPicture(-5, "0;(0)")).toBe("(5)");
    expect(formatNumericPicture(0, "0;(0);'zero'")).toBe("zero");
    expect(formatNumericPicture(1.999, "0.0x")).toBe("1.9");
    expect(formatNumericPicture(12.5, "'USD '0.00")).toBe("USD 12.50");
    expect(supportsNumericPicture("0.00")).toBe(true);
    expect(supportsNumericPicture("a0")).toBe(false);
    expect(formatNumericPicture(Number.NaN, "0")).toBeUndefined();
  });

  it("renders number words and capitalization", () => {
    expect(formatNumberWord(12, "CardText")).toBe("twelve");
    expect(formatNumberWord(21, "CardText")).toBe("twenty one");
    expect(formatNumberWord(1234, "CardText")).toBe("one thousand two hundred and thirty four");
    expect(formatNumberWord(2, "OrdText")).toBe("second");
    expect(formatNumberWord(255, "Hex")).toBe("FF");
    expect(formatNumberWord(7, "ArabicDash")).toBe("- 7 -");
    expect(formatCapitalization("hello world", "Caps")).toBe("Hello World");
    expect(formatCapitalization("hello world", "FirstCap")).toBe("Hello world");
    expect(applyStarFormat("12", "roman")).toBe("xii");
    expect(applyStarFormat("12", "ROMAN")).toBe("XII");
    expect(applyStarFormat("not a number", "roman")).toBeUndefined();
  });
});
