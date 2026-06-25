import { describe, expect, it } from "vitest";

import { readFontAssetSync } from "@/export/pdf/fonts/officeFontAssets.js";
import { SfntFontProgram } from "@/text/fonts/sfnt/SfntFontProgram.js";
import { GsubTable } from "@/text/fonts/opentype/GsubTable.js";
import { OpenTypeLayouter } from "@/text/fonts/layout/OpenTypeLayouter.js";
import { SimpleTextLayouter } from "@/text/fonts/layout/SimpleTextLayouter.js";

// Carlito (the bundled Calibri metric-compatible face) ships a GSUB table with
// liga/calt/onum/lnum/pnum/tnum and stylistic sets, so it is a stable, real-font
// vehicle for exercising the shaper deterministically.
function loadCarlito(): SfntFontProgram {
  const bytes = readFontAssetSync("Carlito-Regular.woff2");
  expect(bytes).not.toBeNull();
  return SfntFontProgram.parse(bytes!);
}

describe("GsubTable (Carlito)", () => {
  const font = loadCarlito();
  const raw = font.getRawTableData("GSUB");

  it("parses the GSUB table and exposes the Latin features", () => {
    expect(raw).not.toBeNull();
    const gsub = GsubTable.parse(raw!);
    expect(gsub).not.toBeNull();
    for (const tag of ["liga", "calt", "onum", "lnum", "pnum", "tnum"]) {
      expect(gsub!.hasAnyFeature([tag])).toBe(true);
    }
    expect(gsub!.hasAnyFeature(["nope"])).toBe(false);
    // Requested features map to a non-empty, ascending lookup-index list.
    const indices = gsub!.collectLookupIndices(["liga"]);
    expect(indices.length).toBeGreaterThan(0);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });

  it("returns null for non-GSUB bytes without throwing", () => {
    expect(GsubTable.parse(new Uint8Array([0, 0, 0, 0]))).toBeNull();
  });
});

describe("OpenTypeLayouter (Carlito)", () => {
  const font = loadCarlito();

  it("reports GSUB availability", () => {
    expect(new OpenTypeLayouter(font).hasGsub).toBe(true);
  });

  it("substitutes the fi ligature and merges the source code points", () => {
    const layouter = new OpenTypeLayouter(font);
    const ligated = layouter.layout("fi", ["liga"]);
    expect(ligated.glyphs).toHaveLength(1);
    // The ligature glyph keeps both original code points so PDF copy/search of
    // the ligature still yields "fi".
    expect(ligated.glyphs[0]!.codePoints).toEqual([0x66, 0x69]);
  });

  it("does not shape when no features are requested", () => {
    const layouter = new OpenTypeLayouter(font);
    const plain = layouter.layout("fi", []);
    expect(plain.glyphs).toHaveLength(2);
    expect(plain.glyphs.map((g) => g.codePoints)).toEqual([[0x66], [0x69]]);
  });

  it("changes the figure glyph for old-style numerals (onum)", () => {
    const layouter = new OpenTypeLayouter(font);
    const lining = layouter.layout("3", []).glyphs[0]!.id;
    const oldStyle = layouter.layout("3", ["onum"]).glyphs[0]!.id;
    expect(oldStyle).not.toBe(lining);
  });

  it("matches SimpleTextLayouter exactly when no features apply", () => {
    const shaped = new OpenTypeLayouter(font);
    const simple = new SimpleTextLayouter(font);
    const text = "Hello, World 123";
    const a = shaped.layout(text, []);
    const b = simple.layout(text);
    expect(a.glyphs.map((g) => g.id)).toEqual(b.glyphs.map((g) => g.id));
    expect(a.advanceWidth).toBe(b.advanceWidth);
  });
});
