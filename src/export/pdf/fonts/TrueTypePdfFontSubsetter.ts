import type {
  FontSubset,
  FontSubsetter,
  GlyphInfo,
  ParsedFontProgram,
} from "@/text/fonts/core/types.js";
import { buildSfnt } from "@/text/fonts/vendor/woff2/sfnt-builder.js";

interface GlyphRange {
  start: number;
  end: number;
}

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function u16(bytes: Uint8Array, offset: number): number {
  return view(bytes).getUint16(offset);
}

function i16(bytes: Uint8Array, offset: number): number {
  return view(bytes).getInt16(offset);
}

function writeU16(target: Uint8Array, offset: number, value: number): void {
  view(target).setUint16(offset, value, false);
}

function writeU32(target: Uint8Array, offset: number, value: number): void {
  view(target).setUint32(offset, value, false);
}

function pad4(length: number): number {
  return (length + 3) & ~3;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk): number => sum + pad4(chunk.byteLength), 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += pad4(chunk.byteLength);
  }
  return result;
}

function readLoca(loca: Uint8Array, indexToLocFormat: number): number[] {
  const offsets: number[] = [];
  const table = view(loca);
  if (indexToLocFormat === 0) {
    for (let offset = 0; offset + 1 < loca.byteLength; offset += 2) {
      offsets.push(table.getUint16(offset) * 2);
    }
  } else {
    for (let offset = 0; offset + 3 < loca.byteLength; offset += 4) {
      offsets.push(table.getUint32(offset));
    }
  }
  return offsets;
}

function glyphRange(offsets: number[], glyphId: number): GlyphRange | null {
  const start = offsets[glyphId];
  const end = offsets[glyphId + 1];
  return start === undefined || end === undefined ? null : { start, end };
}

function collectCompositeGlyphs(
  glyph: Uint8Array,
  addGlyph: (glyphId: number) => void,
): void {
  if (glyph.byteLength < 10 || i16(glyph, 0) >= 0) {
    return;
  }

  let offset = 10;
  let flags = 0;
  do {
    if (offset + 4 > glyph.byteLength) return;
    flags = u16(glyph, offset);
    addGlyph(u16(glyph, offset + 2));
    offset += 4;
    offset += flags & 0x0001 ? 4 : 2;
    if (flags & 0x0008) offset += 2;
    else if (flags & 0x0040) offset += 4;
    else if (flags & 0x0080) offset += 8;
  } while (flags & 0x0020);
}

function subsetClosure(
  font: ParsedFontProgram,
  initialGlyphs: Iterable<number>,
): number[] {
  const glyf = font.getRawTableData("glyf");
  const loca = font.getRawTableData("loca");
  const head = font.getRawTableData("head");
  if (!glyf || !loca || !head) {
    return Array.from(new Set([0, ...initialGlyphs])).sort((a, b): number => a - b);
  }

  const offsets = readLoca(loca, u16(head, 50));
  const used = new Set<number>([0, ...initialGlyphs]);
  const stack = Array.from(used);

  while (stack.length > 0) {
    const glyphId = stack.pop()!;
    const range = glyphRange(offsets, glyphId);
    if (!range || range.end <= range.start || range.end > glyf.byteLength) {
      continue;
    }
    const glyph = glyf.slice(range.start, range.end);
    collectCompositeGlyphs(glyph, (componentId): void => {
      if (!used.has(componentId)) {
        used.add(componentId);
        stack.push(componentId);
      }
    });
  }

  return Array.from(used).sort((a, b): number => a - b);
}

function buildLoca(offsets: number[]): Uint8Array {
  const loca = new Uint8Array(offsets.length * 4);
  offsets.forEach((offset, index): void => writeU32(loca, index * 4, offset));
  return loca;
}

function buildHmtx(font: ParsedFontProgram, maxGlyphId: number): Uint8Array {
  const hmtx = new Uint8Array((maxGlyphId + 1) * 4);
  for (let glyphId = 0; glyphId <= maxGlyphId; glyphId += 1) {
    writeU16(hmtx, glyphId * 4, font.advanceWidthForGlyph(glyphId));
    writeU16(hmtx, glyphId * 4 + 2, 0);
  }
  return hmtx;
}

function buildSubsetTables(
  font: ParsedFontProgram,
  glyphIds: number[],
): Record<string, Uint8Array> {
  const glyf = font.getRawTableData("glyf");
  const loca = font.getRawTableData("loca");
  const head = font.getRawTableData("head");
  const hhea = font.getRawTableData("hhea");
  const maxp = font.getRawTableData("maxp");
  const cmap = font.getRawTableData("cmap");
  if (!glyf || !loca || !head || !hhea || !maxp || !cmap) {
    throw new Error("Missing required TrueType tables for subsetting");
  }

  const maxGlyphId = Math.max(0, ...glyphIds);
  const used = new Set(glyphIds);
  const sourceOffsets = readLoca(loca, u16(head, 50));
  const locaOffsets: number[] = [];
  const glyfChunks: Uint8Array[] = [];
  let glyfOffset = 0;

  for (let glyphId = 0; glyphId <= maxGlyphId; glyphId += 1) {
    locaOffsets.push(glyfOffset);
    const range = glyphRange(sourceOffsets, glyphId);
    if (used.has(glyphId) && range && range.end > range.start) {
      const glyph = glyf.slice(range.start, range.end);
      glyfChunks.push(glyph);
      glyfOffset += pad4(glyph.byteLength);
    }
  }
  locaOffsets.push(glyfOffset);

  const newHead = head.slice();
  writeU32(newHead, 8, 0);
  writeU16(newHead, 50, 1);
  const newHhea = hhea.slice();
  writeU16(newHhea, 34, maxGlyphId + 1);
  const newMaxp = maxp.slice();
  writeU16(newMaxp, 4, maxGlyphId + 1);

  const tables: Record<string, Uint8Array> = {
    cmap,
    head: newHead,
    hhea: newHhea,
    hmtx: buildHmtx(font, maxGlyphId),
    loca: buildLoca(locaOffsets),
    maxp: newMaxp,
    glyf: concat(glyfChunks),
  };

  for (const tag of ["OS/2", "name", "post"]) {
    const table = font.getRawTableData(tag);
    if (table) tables[tag] = table;
  }
  return tables;
}

export class TrueTypePdfFontSubsetter implements FontSubsetter {
  createSubset(
    font: ParsedFontProgram,
    glyphs: Iterable<GlyphInfo>,
  ): FontSubset {
    const unicodeByGlyph = new Map<number, number[]>();
    const initialGlyphs: number[] = [];
    for (const glyph of glyphs) {
      initialGlyphs.push(glyph.id);
      if (!unicodeByGlyph.has(glyph.id)) {
        unicodeByGlyph.set(glyph.id, glyph.codePoints);
      }
    }

    const glyphIds = subsetClosure(font, initialGlyphs);
    const tables = buildSubsetTables(font, glyphIds);
    const fontFile = buildSfnt(
      0x00010000,
      new Map(
        Object.entries(tables).map(([tag, data]): [number, Uint8Array<ArrayBufferLike>] => [
          (tag.charCodeAt(0) << 24) |
            (tag.charCodeAt(1) << 16) |
            (tag.charCodeAt(2) << 8) |
            tag.charCodeAt(3),
          data,
        ]),
      ),
    ).ttf;
    const maxGlyphId = Math.max(0, ...glyphIds);
    const widths: number[] = [];
    const unicode: number[][] = [];
    for (let glyphId = 0; glyphId <= maxGlyphId; glyphId += 1) {
      widths[glyphId] =
        (font.advanceWidthForGlyph(glyphId) / font.unitsPerEm) * 1000;
      unicode[glyphId] = unicodeByGlyph.get(glyphId) ?? [0];
    }

    return {
      fontFile,
      widths,
      unicode,
      encodeGlyph: (glyphId): number => glyphId,
    };
  }
}
