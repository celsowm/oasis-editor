import { describe, expect, it } from "vitest";
import { SfntFontProgram } from "@/text/fonts/sfnt/SfntFontProgram.js";
import { readFontAssetSync } from "@/export/pdf/fonts/officeFontAssets.js";

interface TableRecord {
  tag: string;
  checksum: number;
  bytes: Uint8Array;
}

function readTables(font: Uint8Array): TableRecord[] {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
  const numTables = view.getUint16(4);
  const records: TableRecord[] = [];
  for (let i = 0; i < numTables; i += 1) {
    const recOffset = 12 + i * 16;
    const tag = String.fromCharCode(
      font[recOffset]!,
      font[recOffset + 1]!,
      font[recOffset + 2]!,
      font[recOffset + 3]!,
    );
    const checksum = view.getUint32(recOffset + 4);
    const offset = view.getUint32(recOffset + 8);
    const length = view.getUint32(recOffset + 12);
    records.push({ tag, checksum, bytes: font.slice(offset, offset + length) });
  }
  return records;
}

const align4 = (n: number): number => (n + 3) & ~3;

/** Packs whole sfnt fonts into a minimal valid `ttcf` collection. */
function buildTtc(fonts: Uint8Array[]): Uint8Array {
  const perFont = fonts.map(readTables);
  const headerSize = 12 + 4 * fonts.length;
  const offsetTableSizes = perFont.map((tables) => 12 + tables.length * 16);
  let cursor = headerSize + offsetTableSizes.reduce((a, b) => a + b, 0);

  // Assign each table a file offset (4-byte aligned) and record it.
  const placed = perFont.map((tables) =>
    tables.map((table) => {
      cursor = align4(cursor);
      const offset = cursor;
      cursor += table.bytes.byteLength;
      return { ...table, offset };
    }),
  );
  const total = align4(cursor);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);

  // TTC header.
  out.set([0x74, 0x74, 0x63, 0x66], 0); // 'ttcf'
  view.setUint16(4, 1); // majorVersion
  view.setUint16(6, 0); // minorVersion
  view.setUint32(8, fonts.length);
  let otOffset = headerSize;
  perFont.forEach((tables, i) => {
    view.setUint32(12 + i * 4, otOffset);
    otOffset += 12 + tables.length * 16;
  });

  // Per-font offset tables + table data.
  let ot = headerSize;
  placed.forEach((tables) => {
    view.setUint32(ot, 0x00010000); // sfntVersion
    view.setUint16(ot + 4, tables.length);
    // searchRange/entrySelector/rangeShift left zero (parser skips them).
    tables.forEach((table, j) => {
      const rec = ot + 12 + j * 16;
      for (let k = 0; k < 4; k += 1) out[rec + k] = table.tag.charCodeAt(k);
      view.setUint32(rec + 4, table.checksum);
      view.setUint32(rec + 8, table.offset);
      view.setUint32(rec + 12, table.bytes.byteLength);
      out.set(table.bytes, table.offset);
    });
    ot += 12 + tables.length * 16;
  });

  return out;
}

describe("TTC face selection", () => {
  it("parses each sub-font of a collection independently", () => {
    const arimo = readFontAssetSync("Arimo-Regular.woff2")!;
    const tinos = readFontAssetSync("Tinos-Regular.woff2")!;
    const ttc = buildTtc([arimo, tinos]);

    const programs = SfntFontProgram.parseCollection(ttc);
    expect(programs).toHaveLength(2);

    const psNames = [arimo, tinos].map(
      (bytes) => SfntFontProgram.parse(bytes).metadata.postscriptName,
    );
    // Sub-font 0 == Arimo, sub-font 1 == Tinos (not both the first font).
    expect(programs[0]!.metadata.postscriptName).toBe(psNames[0]);
    expect(programs[1]!.metadata.postscriptName).toBe(psNames[1]);
    expect(psNames[0]).not.toBe(psNames[1]);

    // And the metrics of each sub-font match the standalone font.
    const lineH = (p: SfntFontProgram): number => p.naturalLineHeightPx(1000);
    expect(lineH(programs[0]!)).toBeCloseTo(
      lineH(SfntFontProgram.parse(arimo)),
      4,
    );
    expect(lineH(programs[1]!)).toBeCloseTo(
      lineH(SfntFontProgram.parse(tinos)),
      4,
    );
  });

  it("plain sfnt still yields a single program", () => {
    const arimo = readFontAssetSync("Arimo-Regular.woff2")!;
    expect(SfntFontProgram.parseCollection(arimo)).toHaveLength(1);
  });

  it("exposes macStyle bold/italic for face matching", () => {
    const regular = SfntFontProgram.parse(
      readFontAssetSync("Arimo-Regular.woff2")!,
    );
    const bold = SfntFontProgram.parse(readFontAssetSync("Arimo-Bold.woff2")!);
    expect(regular.metadata.macStyleBold).toBe(false);
    expect(bold.metadata.macStyleBold).toBe(true);
  });
});
