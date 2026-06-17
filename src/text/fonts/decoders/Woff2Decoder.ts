import type { FontDecoder } from "@/text/fonts/core/types.js";
import {
  decompressBrotli,
  decompressBrotliSync,
  type BrotliDecompress,
  type BrotliDecompressSync,
} from "./Brotli.js";
import { Buf, readBase128 } from "@/text/fonts/vendor/woff2/buffer.js";
import {
  TAG_GLYF,
  TAG_LOCA,
  TAG_HMTX,
  TAG_HHEA,
  TAG_HEAD,
  KNOWN_TAGS,
  tagToString,
} from "@/text/fonts/vendor/woff2/utils.js";
import {
  buildSfnt,
  CHECKSUM_ADJUSTMENT_OFFSET,
} from "@/text/fonts/vendor/woff2/sfnt-builder.js";
import {
  type GlyfReconstruction,
  reconstructGlyfTable,
} from "@/text/fonts/vendor/woff2/glyf-reconstructor.js";
import {
  readNumHMetrics,
  reconstructTransformedHmtx,
} from "@/text/fonts/vendor/woff2/hmtx-reconstructor.js";

export interface Woff2Dependencies {
  decompress?: BrotliDecompress;
  decompressSync?: BrotliDecompressSync;
  transformers?: Map<number, Woff2Transform>;
}

interface ResolvedWoff2Dependencies {
  decompress: BrotliDecompress;
  decompressSync: BrotliDecompressSync;
  transformers: Map<number, Woff2Transform>;
}

// --- Constants --------------------------------------------------------------

const WOFF2_SIGNATURE = 0x774f4632; // "wOF2"
const WOFF2_HEADER_SIZE = 48;
const WOFF2_FLAG_TRANSFORM = 1 << 8;
const MAX_PLAUSIBLE_COMPRESSION_RATIO = 100;

function resolveDependencies(
  deps?: Partial<Woff2Dependencies>,
): ResolvedWoff2Dependencies {
  return {
    decompress: deps?.decompress ?? decompressBrotli,
    decompressSync: deps?.decompressSync ?? decompressBrotliSync,
    transformers: deps?.transformers ?? createDefaultTransformers(),
  };
}

// --- Types used internally --------------------------------------------------

interface Woff2Table {
  tag: number;
  flags: number;
  srcOffset: number;
  srcLength: number;
  transformLength: number;
  dstLength: number;
}

interface Woff2Header {
  flavor: number;
  numTables: number;
  compressedOffset: number;
  compressedLength: number;
  uncompressedSize: number;
  tables: Woff2Table[];
}

interface TransformState {
  glyfInfo: GlyfReconstruction | null;
  numHMetrics: number;
}

interface TransformContext {
  header: Woff2Header;
  tableMap: Map<number, Uint8Array>;
  tablesByTag: Map<number, Woff2Table>;
  state: TransformState;
}

type Woff2Transform = (
  table: Woff2Table,
  srcData: Uint8Array,
  context: TransformContext,
) => void;

// --- Table directory parsing ------------------------------------------------

function readTableDirectory(buf: Buf, numTables: number): Woff2Table[] {
  const tables: Woff2Table[] = [];
  let srcOffset = 0;

  for (let i = 0; i < numTables; i++) {
    const flagByte = buf.readU8();
    let tag: number;
    if ((flagByte & 0x3f) === 0x3f) {
      tag = buf.readU32();
    } else {
      tag = KNOWN_TAGS[flagByte & 0x3f] ?? 0;
    }
    const xformVersion = (flagByte >> 6) & 0x03;
    let flags = 0;
    if (tag === TAG_GLYF || tag === TAG_LOCA) {
      if (xformVersion === 0) {
        flags |= WOFF2_FLAG_TRANSFORM;
      }
    } else if (xformVersion !== 0) {
      flags |= WOFF2_FLAG_TRANSFORM;
    }
    flags |= xformVersion;

    const dstLength = readBase128(buf);
    let transformLength = dstLength;
    if (flags & WOFF2_FLAG_TRANSFORM) {
      transformLength = readBase128(buf);
      if (tag === TAG_LOCA && transformLength !== 0) {
        throw new Error(
          "Invalid WOFF2: transformed loca must have zero length",
        );
      }
    }

    tables.push({
      tag,
      flags,
      srcOffset,
      srcLength: transformLength,
      transformLength,
      dstLength,
    });

    srcOffset += transformLength;
  }

  return tables;
}

function parseHeader(fontData: Uint8Array): Woff2Header {
  if (fontData.byteLength < WOFF2_HEADER_SIZE) {
    throw new Error("Invalid WOFF2: file too short");
  }

  const buf = new Buf(fontData);

  const signature = buf.readU32();
  if (signature !== WOFF2_SIGNATURE) {
    throw new Error("Invalid WOFF2 signature");
  }

  const flavor = buf.readU32() >>> 0;
  const reportedLength = buf.readU32();
  if (reportedLength !== fontData.byteLength) {
    throw new Error("Invalid WOFF2: length mismatch");
  }

  const numTables = buf.readU16();
  if (numTables === 0) {
    throw new Error("Invalid WOFF2: no tables");
  }

  buf.skip(2 + 4); // reserved + totalSfntSize (unused)
  const compressedLength = buf.readU32();
  buf.skip(4); // major/minorVersion

  // metadata and private blocks (validate bounds if present)
  const metaOffset = buf.readU32();
  const metaLength = buf.readU32();
  const metaOrigLen = buf.readU32();
  if (metaOffset !== 0) {
    if (metaOffset + metaLength > fontData.byteLength || metaOrigLen === 0) {
      throw new Error("Invalid WOFF2 metadata block");
    }
  }

  const privOffset = buf.readU32();
  const privLength = buf.readU32();
  if (privOffset !== 0 && privOffset + privLength > fontData.byteLength) {
    throw new Error("Invalid WOFF2 private block");
  }

  const tables = readTableDirectory(buf, numTables);

  const lastTable = tables[tables.length - 1];
  const uncompressedSize = lastTable.srcOffset + lastTable.srcLength;

  const compressedOffset = buf.offset;
  if (compressedOffset + compressedLength > fontData.byteLength) {
    throw new Error("Invalid WOFF2: compressed stream truncated");
  }

  // Basic ratio sanity check (similar to upstream impl)
  const compressionRatio = uncompressedSize / Math.max(1, fontData.byteLength);
  if (compressionRatio > MAX_PLAUSIBLE_COMPRESSION_RATIO) {
    throw new Error("Invalid WOFF2: implausible compression ratio");
  }

  return {
    flavor,
    numTables,
    compressedOffset,
    compressedLength,
    uncompressedSize,
    tables,
  };
}

// --- Transform registry ----------------------------------------------------

function transformGlyfTable(
  _table: Woff2Table,
  srcData: Uint8Array,
  context: TransformContext,
): void {
  const locaTable = context.tablesByTag.get(TAG_LOCA);
  if (!locaTable) {
    throw new Error("Invalid WOFF2: missing loca for glyf");
  }
  const glyfInfo = reconstructGlyfTable(srcData, locaTable.dstLength);
  context.state.glyfInfo = glyfInfo;
  context.tableMap.set(TAG_GLYF, glyfInfo.glyfData);
  context.tableMap.set(TAG_LOCA, glyfInfo.locaData);
}

function transformLocaTable(
  _table: Woff2Table,
  _srcData: Uint8Array,
  context: TransformContext,
): void {
  if (!context.tableMap.has(TAG_LOCA)) {
    throw new Error("Invalid WOFF2: loca transformed without glyf");
  }
}

function transformHmtxTable(
  _table: Woff2Table,
  srcData: Uint8Array,
  context: TransformContext,
): void {
  const glyfInfo = context.state.glyfInfo;
  if (!glyfInfo) {
    throw new Error("Invalid WOFF2: hmtx transform before glyf");
  }
  const hmtx = reconstructTransformedHmtx(
    srcData,
    glyfInfo.numGlyphs,
    context.state.numHMetrics,
    glyfInfo.xMins,
  );
  context.tableMap.set(TAG_HMTX, hmtx.data);
}

function createDefaultTransformers(): Map<number, Woff2Transform> {
  return new Map<number, Woff2Transform>([
    [TAG_GLYF, transformGlyfTable],
    [TAG_LOCA, transformLocaTable],
    [TAG_HMTX, transformHmtxTable],
  ]);
}

// --- Font rebuild -----------------------------------------------------------

function rebuildFont(
  header: Woff2Header,
  transformed: Uint8Array,
  deps: ResolvedWoff2Dependencies,
): { ttf: Uint8Array; tables: Record<string, Uint8Array> } {
  const tableMap = new Map<number, Uint8Array>();
  const tablesByTag = new Map(header.tables.map((t) => [t.tag, t]));
  const state: TransformState = { glyfInfo: null, numHMetrics: 0 };
  const context: TransformContext = { header, tableMap, tablesByTag, state };
  const transformers = deps.transformers;

  const sortedTables = header.tables.slice().sort((a, b) => a.tag - b.tag);

  for (const table of sortedTables) {
    const srcStart = table.srcOffset;
    const srcEnd = srcStart + table.srcLength;
    if (srcEnd > transformed.length) {
      throw new Error("Invalid WOFF2: table outside brotli buffer");
    }
    const srcData = transformed.subarray(srcStart, srcEnd);

    if ((table.flags & WOFF2_FLAG_TRANSFORM) === 0) {
      const data = new Uint8Array(srcData); // copy
      if (table.tag === TAG_HEAD && data.length >= 12) {
        // Zero checkSumAdjustment before checksums
        data[CHECKSUM_ADJUSTMENT_OFFSET] = 0;
        data[CHECKSUM_ADJUSTMENT_OFFSET + 1] = 0;
        data[CHECKSUM_ADJUSTMENT_OFFSET + 2] = 0;
        data[CHECKSUM_ADJUSTMENT_OFFSET + 3] = 0;
      }
      tableMap.set(table.tag, data);
      if (table.tag === TAG_HHEA) {
        state.numHMetrics = readNumHMetrics(data);
      }
      continue;
    }

    const transformer = transformers.get(table.tag);
    if (!transformer) {
      throw new Error(
        `Unsupported WOFF2 transform for ${tagToString(table.tag)}`,
      );
    }
    transformer(table, srcData, context);
  }

  return buildSfnt(header.flavor, tableMap);
}

// --- Public API -------------------------------------------------------------

export async function decodeWoff2(
  fontData: Uint8Array,
  deps?: Partial<Woff2Dependencies>,
): Promise<Uint8Array> {
  const resolvedDeps = resolveDependencies(deps);
  const header = parseHeader(fontData);
  const compressed = fontData.subarray(
    header.compressedOffset,
    header.compressedOffset + header.compressedLength,
  );

  const decompressed = await resolvedDeps.decompress(compressed);
  if (decompressed.byteLength !== header.uncompressedSize) {
    throw new Error("Invalid WOFF2: brotli size mismatch");
  }

  const rebuilt = rebuildFont(header, decompressed, resolvedDeps);
  return rebuilt.ttf;
}

export function decodeWoff2Sync(
  fontData: Uint8Array,
  deps?: Partial<Woff2Dependencies>,
): Uint8Array {
  const resolvedDeps = resolveDependencies(deps);
  const header = parseHeader(fontData);
  const compressed = fontData.subarray(
    header.compressedOffset,
    header.compressedOffset + header.compressedLength,
  );

  const decompressed = resolvedDeps.decompressSync(compressed);
  if (decompressed.byteLength !== header.uncompressedSize) {
    throw new Error("Invalid WOFF2: brotli size mismatch");
  }

  return rebuildFont(header, decompressed, resolvedDeps).ttf;
}

export class Woff2Decoder implements FontDecoder {
  readonly format = "woff2" as const;

  canDecode(bytes: Uint8Array): boolean {
    return (
      bytes.byteLength >= 4 &&
      bytes[0] === 0x77 &&
      bytes[1] === 0x4f &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x32
    );
  }

  decode(bytes: Uint8Array): Promise<Uint8Array> {
    return decodeWoff2(bytes);
  }

  decodeSync(bytes: Uint8Array): Uint8Array {
    return decodeWoff2Sync(bytes);
  }
}
