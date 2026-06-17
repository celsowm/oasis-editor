import { describe, expect, it } from "vitest";

import {
  OFFICE_COMPAT_FONT_FAMILIES,
  readFontAssetSync,
  ROBOTO_FONT_FILES,
} from "@/export/pdf/fonts/officeFontAssets.js";
import { SfntFontProgram } from "@/text/fonts/sfnt/SfntFontProgram.js";

function loadFont(fileName: string): SfntFontProgram {
  const bytes = readFontAssetSync(fileName);
  expect(bytes).not.toBeNull();
  return SfntFontProgram.parse(bytes!);
}

describe("TrueTypeFont", () => {
  const carlito = loadFont("Carlito-Regular.woff2");

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
      "Arimo-Regular.woff2",
      "Tinos-Regular.woff2",
      "Carlito-Bold.woff2",
    ]) {
      const font = loadFont(file);
      expect(font.unitsPerEm).toBeGreaterThan(0);
      expect(
        font.advanceWidthForCodePoint("A".codePointAt(0)!),
      ).toBeGreaterThan(0);
    }
  });

  it("decodes every bundled WOFF2 face into a valid sfnt font", () => {
    const files = new Set<string>();
    for (const definition of OFFICE_COMPAT_FONT_FAMILIES) {
      for (const fileName of Object.values(definition.files)) {
        files.add(fileName);
      }
    }
    for (const fileName of Object.values(ROBOTO_FONT_FILES)) {
      files.add(fileName);
    }

    expect(files.size).toBe(20);
    for (const fileName of files) {
      const font = loadFont(fileName);
      expect(font.unitsPerEm).toBeGreaterThan(0);
      expect(font.hasGlyphForCodePoint("A".codePointAt(0)!)).toBe(true);
      expect(
        font.advanceWidthForCodePoint("A".codePointAt(0)!),
      ).toBeGreaterThan(0);
    }
  });

  it("reads Word text-top offset from OS/2 vertical metrics", () => {
    expect(carlito.wordTextTopOffsetPx(14.6667)).toBeCloseTo(2.96, 2);
  });
});
