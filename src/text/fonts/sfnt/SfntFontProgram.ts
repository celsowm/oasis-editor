import { BinaryReader } from "@/text/truetype/BinaryReader.js";
import { parseCmap, type CmapSubtable } from "@/text/truetype/CmapParser.js";
import { SfntTableDirectory } from "@/text/truetype/SfntTableDirectory.js";
import {
  parseHeadUnitsPerEm,
  parseHheaNumberOfHMetrics,
  parseHheaVerticalMetrics,
  parseHmtxAdvances,
  parseMaxpNumGlyphs,
  parseOs2VerticalMetrics,
} from "@/text/truetype/tableParsers.js";
import type {
  FontMetadata,
  ParsedFontProgram,
} from "@/text/fonts/core/types.js";

function readSignedFixed16_16(reader: BinaryReader, offset: number): number {
  const integer = reader.u16At(offset);
  const fraction = reader.u16At(offset + 2);
  const signed = integer & 0x8000 ? integer - 0x10000 : integer;
  return signed + fraction / 0x10000;
}

function readAscii(bytes: Uint8Array): string {
  return Array.from(bytes, (byte): string => String.fromCharCode(byte)).join(
    "",
  );
}

function readUtf16Be(bytes: Uint8Array): string {
  const units: number[] = [];
  for (let index = 0; index + 1 < bytes.byteLength; index += 2) {
    units.push((bytes[index]! << 8) | bytes[index + 1]!);
  }
  return String.fromCharCode(...units);
}

function parseNameTable(bytes: Uint8Array, fallback: string): string {
  if (bytes.byteLength < 6) return fallback;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(2);
  const stringOffset = view.getUint16(4);
  let selected: string | null = null;

  for (let index = 0; index < count; index += 1) {
    const recordOffset = 6 + index * 12;
    if (recordOffset + 12 > bytes.byteLength) break;
    const platform = view.getUint16(recordOffset);
    const nameId = view.getUint16(recordOffset + 6);
    const length = view.getUint16(recordOffset + 8);
    const offset = view.getUint16(recordOffset + 10);
    if (nameId !== 6) continue;
    const start = stringOffset + offset;
    const end = start + length;
    if (end > bytes.byteLength) continue;
    const raw = bytes.subarray(start, end);
    const value =
      platform === 0 || platform === 3 ? readUtf16Be(raw) : readAscii(raw);
    if (value.trim()) {
      selected = value.trim();
      if (platform === 3) break;
    }
  }

  return selected ?? fallback;
}

function tableSlice(
  bytes: Uint8Array,
  offset: number,
  length: number,
): Uint8Array {
  return bytes.slice(offset, offset + length);
}

export class SfntFontProgram implements ParsedFontProgram {
  readonly unitsPerEm: number;
  readonly verticalMetrics;
  readonly os2VerticalMetrics;
  readonly metadata: FontMetadata;
  readonly glyphCount: number;

  private readonly cmap: CmapSubtable;
  private readonly advanceForGlyph: (glyphId: number) => number;

  private constructor(
    readonly sfntBytes: Uint8Array,
    private readonly directory: SfntTableDirectory,
  ) {
    const reader = new BinaryReader(sfntBytes);
    const head = directory.requireTable("head");
    const hhea = directory.requireTable("hhea");
    const maxp = directory.requireTable("maxp");
    const hmtx = directory.requireTable("hmtx");
    const cmap = directory.requireTable("cmap");

    this.unitsPerEm = parseHeadUnitsPerEm(reader, head.offset);
    this.verticalMetrics = parseHheaVerticalMetrics(reader, hhea.offset);
    const numberOfHMetrics = parseHheaNumberOfHMetrics(reader, hhea.offset);
    this.glyphCount = parseMaxpNumGlyphs(reader, maxp.offset);
    this.advanceForGlyph = parseHmtxAdvances(
      reader,
      hmtx.offset,
      Math.min(numberOfHMetrics, this.glyphCount),
    );
    this.cmap = parseCmap(reader, cmap.offset);

    const os2 = directory.getTable("OS/2");
    this.os2VerticalMetrics = os2
      ? parseOs2VerticalMetrics(reader, os2.offset, os2.length)
      : null;
    this.metadata = this.parseMetadata(reader, head, os2);
  }

  static parse(sfntBytes: Uint8Array): SfntFontProgram {
    const reader = new BinaryReader(sfntBytes);
    return new SfntFontProgram(sfntBytes, SfntTableDirectory.parse(reader));
  }

  /**
   * Every face in the bytes: one program for a plain sfnt, or one per sub-font
   * for a TrueType Collection (`ttcf`). Lets the caller select the exact
   * bold/italic face by its name/macStyle instead of taking the first font.
   */
  static parseCollection(sfntBytes: Uint8Array): SfntFontProgram[] {
    const offsets = SfntTableDirectory.collectionOffsets(
      new BinaryReader(sfntBytes),
    );
    if (!offsets) {
      return [SfntFontProgram.parse(sfntBytes)];
    }
    return offsets.map(
      (offset): SfntFontProgram =>
        new SfntFontProgram(
          sfntBytes,
          SfntTableDirectory.parseAt(new BinaryReader(sfntBytes), offset),
        ),
    );
  }

  glyphForCodePoint(codePoint: number): number {
    return this.cmap.glyphForCodePoint(codePoint);
  }

  hasGlyphForCodePoint(codePoint: number): boolean {
    return this.glyphForCodePoint(codePoint) !== 0;
  }

  advanceWidthForGlyph(glyphId: number): number {
    return this.advanceForGlyph(glyphId);
  }

  advanceWidthForCodePoint(codePoint: number): number {
    return this.advanceWidthForGlyph(this.glyphForCodePoint(codePoint));
  }

  getRawTableData(tag: string): Uint8Array | null {
    const record = this.directory.getTable(tag);
    return record
      ? tableSlice(this.sfntBytes, record.offset, record.length)
      : null;
  }

  naturalLineHeightPx(fontSizePx: number): number {
    const { ascent, descent, lineGap } = this.verticalMetrics;
    return ((ascent - descent + lineGap) / this.unitsPerEm) * fontSizePx;
  }

  wordTextTopOffsetPx(fontSizePx: number): number {
    if (!this.os2VerticalMetrics) {
      return 0;
    }
    const { winAscent, typoAscender } = this.os2VerticalMetrics;
    return (
      (Math.max(0, winAscent - typoAscender) / this.unitsPerEm) * fontSizePx
    );
  }

  private parseMetadata(
    reader: BinaryReader,
    head: { offset: number; length: number },
    os2: { offset: number; length: number } | undefined,
  ): FontMetadata {
    reader.seek(head.offset + 36);
    const xMin = reader.i16();
    const yMin = reader.i16();
    const xMax = reader.i16();
    const yMax = reader.i16();
    const macStyle = reader.u16();
    const name = this.getRawTableData("name");
    const post = this.getRawTableData("post");
    const postscriptName = name
      ? parseNameTable(name, "OasisFont")
      : "OasisFont";

    let italicAngle = 0;
    let isFixedPitch = false;
    if (post && post.byteLength >= 16) {
      const postReader = new BinaryReader(post);
      italicAngle = readSignedFixed16_16(postReader, 4);
      isFixedPitch =
        ((post[12]! << 24) |
          (post[13]! << 16) |
          (post[14]! << 8) |
          post[15]!) !==
        0;
    }

    let familyClass = 0;
    let capHeight = this.verticalMetrics.ascent;
    let xHeight = 0;
    if (os2 && os2.length >= 32) {
      reader.seek(os2.offset + 30);
      familyClass = reader.i16();
      if (os2.length >= 90) {
        reader.seek(os2.offset + 86);
        xHeight = reader.i16();
        capHeight = reader.i16();
      }
    }

    return {
      postscriptName,
      bbox: { minX: xMin, minY: yMin, maxX: xMax, maxY: yMax },
      ascent: this.verticalMetrics.ascent,
      descent: this.verticalMetrics.descent,
      capHeight,
      xHeight,
      italicAngle,
      isFixedPitch,
      macStyleBold: (macStyle & 0x01) !== 0,
      macStyleItalic: (macStyle & 0x02) !== 0,
      familyClass,
    };
  }
}
