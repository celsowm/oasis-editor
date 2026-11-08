import { describe, expect, it } from "vitest";
import {
  formatPageNumber,
  pageNumberFormatFromSwitch,
  pageNumberFormatToSwitch,
} from "@/core/format/pageNumberFormat.js";

describe("pageNumberFormatToSwitch", () => {
  it("emits no switch for the default decimal format", () => {
    expect(pageNumberFormatToSwitch(undefined)).toBeUndefined();
    expect(pageNumberFormatToSwitch("decimal")).toBeUndefined();
  });

  it("emits the case-sensitive switch for non-decimal formats", () => {
    expect(pageNumberFormatToSwitch("roman")).toBe("roman");
    expect(pageNumberFormatToSwitch("ROMAN")).toBe("ROMAN");
    expect(pageNumberFormatToSwitch("alphabetic")).toBe("alphabetic");
    expect(pageNumberFormatToSwitch("ALPHABETIC")).toBe("ALPHABETIC");
    expect(pageNumberFormatToSwitch("Ordinal")).toBe("Ordinal");
  });
});

describe("pageNumberFormatFromSwitch", () => {
  it("recovers recognized switches and ignores unknown ones", () => {
    expect(pageNumberFormatFromSwitch("roman")).toBe("roman");
    expect(pageNumberFormatFromSwitch("ROMAN")).toBe("ROMAN");
    expect(pageNumberFormatFromSwitch("Ordinal")).toBe("Ordinal");
    expect(pageNumberFormatFromSwitch("CardText")).toBeUndefined();
    expect(pageNumberFormatFromSwitch(undefined)).toBeUndefined();
  });
});

describe("formatPageNumber", () => {
  it("uses decimal by default", () => {
    expect(formatPageNumber(12, undefined)).toBe("12");
    expect(formatPageNumber(12, "decimal")).toBe("12");
  });

  it("formats lowercase roman numerals", () => {
    expect(formatPageNumber(1, "roman")).toBe("i");
    expect(formatPageNumber(4, "roman")).toBe("iv");
    expect(formatPageNumber(9, "roman")).toBe("ix");
    expect(formatPageNumber(49, "roman")).toBe("xlix");
    expect(formatPageNumber(1999, "roman")).toBe("mcmxcix");
  });

  it("formats uppercase roman numerals", () => {
    expect(formatPageNumber(4, "ROMAN")).toBe("IV");
    expect(formatPageNumber(1999, "ROMAN")).toBe("MCMXCIX");
  });

  it("formats alphabetic page numbers", () => {
    expect(formatPageNumber(1, "alphabetic")).toBe("a");
    expect(formatPageNumber(26, "alphabetic")).toBe("z");
    expect(formatPageNumber(27, "alphabetic")).toBe("aa");
    expect(formatPageNumber(28, "alphabetic")).toBe("ab");
    expect(formatPageNumber(1, "ALPHABETIC")).toBe("A");
    expect(formatPageNumber(27, "ALPHABETIC")).toBe("AA");
  });

  it("formats ordinal page numbers", () => {
    expect(formatPageNumber(1, "Ordinal")).toBe("1st");
    expect(formatPageNumber(2, "Ordinal")).toBe("2nd");
    expect(formatPageNumber(3, "Ordinal")).toBe("3rd");
    expect(formatPageNumber(4, "Ordinal")).toBe("4th");
    expect(formatPageNumber(11, "Ordinal")).toBe("11th");
    expect(formatPageNumber(12, "Ordinal")).toBe("12th");
    expect(formatPageNumber(21, "Ordinal")).toBe("21st");
  });

  it("falls back to the raw number for non-positive values", () => {
    expect(formatPageNumber(0, "roman")).toBe("0");
    expect(formatPageNumber(-2, "alphabetic")).toBe("-2");
  });
});
