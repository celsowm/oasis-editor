import {
  computeULongSum,
  round4,
  store16,
  store32,
  tagToString,
  TAG_HEAD,
} from "./utils.js";

export const SFNT_HEADER_SIZE = 12;
export const SFNT_ENTRY_SIZE = 16;
export const CHECKSUM_ADJUSTMENT_OFFSET = 8;

export function buildSfnt(
  flavor: number,
  tableData: Map<number, Uint8Array>
): { ttf: Uint8Array; tables: Record<string, Uint8Array> } {
  const entries = Array.from(tableData.entries()).sort((a, b) => a[0] - b[0]);
  const numTables = entries.length;
  let offset = SFNT_HEADER_SIZE + SFNT_ENTRY_SIZE * numTables;

  const records: {
    tag: number;
    checksum: number;
    offset: number;
    length: number;
    data: Uint8Array;
  }[] = [];

  for (const [tag, data] of entries) {
    const paddedLen = round4(data.length);
    records.push({
      tag,
      checksum: computeULongSum(data),
      offset,
      length: data.length,
      data
    });
    offset += paddedLen;
  }

  const ttf = new Uint8Array(offset);
  let off = 0;
  off = store32(flavor >>> 0, ttf, off);
  off = store16(numTables, ttf, off);
  let maxPow2 = 0;
  while ((1 << (maxPow2 + 1)) <= numTables) maxPow2++;
  const searchRange = (1 << maxPow2) * 16;
  off = store16(searchRange, ttf, off);
  off = store16(maxPow2, ttf, off);
  off = store16(numTables * 16 - searchRange, ttf, off);

  // table records
  for (const rec of records) {
    off = store32(rec.tag, ttf, off);
    off = store32(rec.checksum, ttf, off);
    off = store32(rec.offset, ttf, off);
    off = store32(rec.length, ttf, off);
  }

  for (const rec of records) {
    ttf.set(rec.data, rec.offset);
    // zero padding already present
  }

  // checkSumAdjustment for 'head'
  const headRecord = records.find((r) => r.tag === TAG_HEAD);
  if (headRecord) {
    const checksum = computeULongSum(ttf);
    const adjustment = (0xb1b0afba - checksum) >>> 0;
    store32(adjustment, ttf, headRecord.offset + CHECKSUM_ADJUSTMENT_OFFSET);
  }

  const tables: Record<string, Uint8Array> = {};
  for (const [tag, data] of entries) {
    tables[tagToString(tag)] = data;
  }

  return { ttf, tables };
}
