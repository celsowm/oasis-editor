import { describe, it, expect } from "vitest";
import {
  nextFontSizePt,
  previousFontSizePt,
} from "@/ui/fontSizeUnits.js";

describe("font size stepping", () => {
  it("grows to the next standard size", () => {
    expect(nextFontSizePt(12)).toBe(14);
    expect(nextFontSizePt(11)).toBe(12);
  });

  it("grows from an intermediate size to the next larger standard size", () => {
    expect(nextFontSizePt(13)).toBe(14);
    expect(nextFontSizePt(15)).toBe(16);
  });

  it("grows beyond the largest standard size by 10pt", () => {
    expect(nextFontSizePt(72)).toBe(82);
  });

  it("shrinks to the previous standard size", () => {
    expect(previousFontSizePt(12)).toBe(11);
    expect(previousFontSizePt(72)).toBe(48);
  });

  it("shrinks from an intermediate size to the next smaller standard size", () => {
    expect(previousFontSizePt(13)).toBe(12);
    expect(previousFontSizePt(15)).toBe(14);
  });

  it("shrinks below the smallest standard size by 1pt, floored at 1", () => {
    expect(previousFontSizePt(8)).toBe(7);
    expect(previousFontSizePt(1)).toBe(1);
  });
});
