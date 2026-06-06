import { Buf } from "./buffer.js";
import { computeULongSum, store16 } from "./utils.js";

export function readNumHMetrics(hheaTable: Uint8Array): number {
  const buf = new Buf(hheaTable);
  buf.skip(34);
  return buf.readU16();
}

export function reconstructTransformedHmtx(
  transformed: Uint8Array,
  numGlyphs: number,
  numHMetrics: number,
  xMins: Int16Array
): { data: Uint8Array; checksum: number } {
  const buf = new Buf(transformed);
  const flags = buf.readU8();
  const hasPropLSB = (flags & 1) === 0;
  const hasMonoLSB = (flags & 2) === 0;
  if ((flags & 0xfc) !== 0) {
    throw new Error("Invalid hmtx flags");
  }
  if (hasPropLSB && hasMonoLSB) {
    throw new Error("Invalid hmtx transform state");
  }
  if (numHMetrics < 1 || numHMetrics > numGlyphs) {
    throw new Error("Invalid hmtx metrics count");
  }

  const advanceWidths: number[] = [];
  const lsbs: number[] = [];

  for (let i = 0; i < numHMetrics; i++) {
    advanceWidths.push(buf.readU16());
  }

  for (let i = 0; i < numHMetrics; i++) {
    lsbs.push(hasPropLSB ? buf.readS16() : xMins[i]);
  }

  for (let i = numHMetrics; i < numGlyphs; i++) {
    lsbs.push(hasMonoLSB ? buf.readS16() : xMins[i]);
  }

  const out = new Uint8Array(2 * numGlyphs + 2 * numHMetrics);
  let off = 0;
  for (let i = 0; i < numGlyphs; i++) {
    if (i < numHMetrics) {
      off = store16(advanceWidths[i], out, off);
    }
    off = store16(lsbs[i], out, off);
  }

  return { data: out, checksum: computeULongSum(out) };
}
