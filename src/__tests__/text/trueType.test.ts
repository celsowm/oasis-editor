import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { TrueTypeFont } from "../../text/truetype/TrueTypeFont.js";

const ASSET_DIR = new URL(
  "../../export/pdf/fonts/assets/",
  import.meta.url,
);

function loadFont(fileName: string): TrueTypeFont {
  const bytes = readFileSync(fileURLToPath(new URL(fileName, ASSET_DIR)));
  return TrueTypeFont.parse(new Uint8Array(bytes));
}

describe("TrueTypeFont", () => {
  const carlito = loadFont("Carlito-Regular.ttf");

  it("reads unitsPerEm from the head table", () => {
    expect(carlito.unitsPerEm).toBe(2048);
  });

  it("maps common Latin code points and returns positive advances", () => {
    for (const ch of [" ", "A", "i", "m", "0", "."]) {
      const cp = ch.codePointAt(0)!;
      expect(carlito.hasGlyphForCodePoint(cp)).toBe(true);
      expect(carlito.advanceWidthForCodePoint(cp)).toBeGreaterThan(0);
    }
  });

  it("orders advance widths by visual width (i < m)", () => {
    const iWidth = carlito.advanceWidthForCodePoint("i".codePointAt(0)!);
    const mWidth = carlito.advanceWidthForCodePoint("m".codePointAt(0)!);
    expect(iWidth).toBeLessThan(mWidth);
  });

  it("returns the .notdef advance for an unmapped astral code point", () => {
    const unmapped = 0x10ffff; // last valid Unicode code point, not in font
    expect(carlito.hasGlyphForCodePoint(unmapped)).toBe(false);
    const notdef = carlito.advanceWidthForCodePoint(0xffff_e); // also unmapped
    expect(carlito.advanceWidthForCodePoint(unmapped)).toBe(notdef);
  });

  it("parses the other bundled metric-compatible faces", () => {
    for (const file of [
      "Arimo-Regular.ttf",
      "Tinos-Regular.ttf",
      "Carlito-Bold.ttf",
    ]) {
      const font = loadFont(file);
      expect(font.unitsPerEm).toBeGreaterThan(0);
      expect(font.advanceWidthForCodePoint("A".codePointAt(0)!)).toBeGreaterThan(
        0,
      );
    }
  });

  it("reads Word text-top offset from OS/2 vertical metrics", () => {
    expect(carlito.wordTextTopOffsetPx(14.6667)).toBeCloseTo(2.96, 2);
  });
});
