import { describe, expect, it } from "vitest";
import { formatDecimal, parseDecimal } from "@/utils/parseNumber.js";

describe("formatDecimal", () => {
  it("renders the document separator without grouping digits", () => {
    expect(formatDecimal("1.27", ",")).toBe("1,27");
    expect(formatDecimal("2.5", ",")).toBe("2,5");
  });

  it("leaves dot locales and integer values untouched", () => {
    expect(formatDecimal("1.27", ".")).toBe("1.27");
    expect(formatDecimal("12", ",")).toBe("12");
  });

  it("keeps an empty (mixed or absent) value empty", () => {
    expect(formatDecimal("", ",")).toBe("");
    expect(formatDecimal("", ".")).toBe("");
  });
});

describe("parseDecimal", () => {
  it("accepts the localized comma and the neutral dot", () => {
    expect(parseDecimal("2,5")).toBe(2.5);
    expect(parseDecimal("2.5")).toBe(2.5);
  });

  it("ignores spaces some keyboards insert between digits", () => {
    expect(parseDecimal(" 2,5 ")).toBe(2.5);
    expect(parseDecimal("1\u00a0234,5")).toBe(1234.5);
  });

  it("returns null for empty or non-numeric input", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("   ")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("2,5,7")).toBeNull();
  });
});
