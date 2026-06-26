import { describe, expect, it } from "vitest";

import { readFontAssetSync } from "@/export/pdf/fonts/officeFontAssets.js";
import { SfntFontProgram } from "@/text/fonts/sfnt/SfntFontProgram.js";
import { GsubTable } from "@/text/fonts/opentype/GsubTable.js";
import { GposTable } from "@/text/fonts/opentype/GposTable.js";
import { OpenTypeLayouter } from "@/text/fonts/layout/OpenTypeLayouter.js";
import { SimpleTextLayouter } from "@/text/fonts/layout/SimpleTextLayouter.js";

// Carlito (the bundled Calibri metric-compatible face) ships a GSUB table with
// liga/calt/onum/lnum/pnum/tnum and stylistic sets, plus a GPOS table with pair
// kerning, so it is a stable, real-font vehicle for exercising the shaper
// deterministically.
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

describe("GposTable (Carlito)", () => {
  const font = loadCarlito();
  const raw = font.getRawTableData("GPOS");

  it("parses the GPOS table and exposes pair kerning", () => {
    expect(raw).not.toBeNull();
    const gpos = GposTable.parse(raw!);
    expect(gpos).not.toBeNull();
    expect(gpos!.hasAnyFeature(["kern"])).toBe(true);
    expect(gpos!.hasAnyFeature(["nope"])).toBe(false);
  });

  it("returns null for non-GPOS bytes without throwing", () => {
    expect(GposTable.parse(new Uint8Array([0, 0, 0, 0]))).toBeNull();
  });

  it("tightens the advance of the first glyph of a kerning pair", () => {
    const gpos = GposTable.parse(raw!)!;
    const av = [font.glyphForCodePoint(0x41), font.glyphForCodePoint(0x56)]; // "AV"
    const advances = av.map((id) => font.advanceWidthForGlyph(id));
    const nominalFirst = advances[0]!;
    gpos.position(av, advances, ["kern"]);
    // "AV" is a classic negative kern: the A's advance shrinks, the V's is left
    // alone (Latin kern carries only value1).
    expect(advances[0]!).toBeLessThan(nominalFirst);
    expect(advances[1]!).toBe(font.advanceWidthForGlyph(av[1]!));
  });

  it("leaves advances untouched when no kern pair matches", () => {
    const gpos = GposTable.parse(raw!)!;
    const ll = [font.glyphForCodePoint(0x6c), font.glyphForCodePoint(0x6c)]; // "ll"
    const advances = ll.map((id) => font.advanceWidthForGlyph(id));
    const before = [...advances];
    gpos.position(ll, advances, ["kern"]);
    expect(advances).toEqual(before);
  });
});

describe("OpenTypeLayouter (Carlito)", () => {
  const font = loadCarlito();

  it("reports GSUB and GPOS availability", () => {
    const layouter = new OpenTypeLayouter(font);
    expect(layouter.hasGsub).toBe(true);
    expect(layouter.hasGpos).toBe(true);
    expect(layouter.hasShaping).toBe(true);
  });

  it("applies pair kerning to xAdvance only when kern is requested", () => {
    const layouter = new OpenTypeLayouter(font);
    const plain = layouter.layout("AV", []);
    const kerned = layouter.layout("AV", ["kern"]);
    // The glyph stream is identical (positioning never changes identity)...
    expect(kerned.glyphs.map((g) => g.id)).toEqual(
      plain.glyphs.map((g) => g.id),
    );
    // ...but the first glyph's advance tightens, narrowing the whole run.
    expect(kerned.positions[0]!.xAdvance).toBeLessThan(
      plain.positions[0]!.xAdvance,
    );
    expect(kerned.advanceWidth).toBeLessThan(plain.advanceWidth);
    // The nominal advanceWidth on the glyph (used for subset widths) is the
    // unkerned metric; only the position carries the kern.
    expect(kerned.glyphs[0]!.advanceWidth).toBe(plain.glyphs[0]!.advanceWidth);
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
