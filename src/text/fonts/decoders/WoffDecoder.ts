import { unzlibSync } from "fflate";
import type { FontDecoder } from "@/text/fonts/core/types.js";
import { buildSfnt } from "@/text/fonts/vendor/woff2/sfnt-builder.js";
import { TAG_HEAD } from "@/text/fonts/vendor/woff2/utils.js";

const WOFF_SIGNATURE = 0x774f4646;
const WOFF_HEADER_SIZE = 44;
const WOFF_TABLE_ENTRY_SIZE = 20;
const MAX_FONT_SIZE = 64 * 1024 * 1024;

function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, false);
}

export class WoffDecoder implements FontDecoder {
  readonly format = "woff" as const;

  canDecode(bytes: Uint8Array): boolean {
    return (
      bytes.byteLength >= 4 &&
      readUint32(
        new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
        0,
      ) === WOFF_SIGNATURE
    );
  }

  decode(bytes: Uint8Array): Promise<Uint8Array> {
    return Promise.resolve(this.decodeSync(bytes));
  }

  decodeSync(bytes: Uint8Array): Uint8Array {
    if (bytes.byteLength < WOFF_HEADER_SIZE) {
      throw new Error("Invalid WOFF header");
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (readUint32(view, 0) !== WOFF_SIGNATURE) {
      throw new Error("Invalid WOFF signature");
    }
    const flavor = readUint32(view, 4);
    const declaredLength = readUint32(view, 8);
    const tableCount = view.getUint16(12, false);
    const totalSfntSize = readUint32(view, 16);
    if (
      declaredLength !== bytes.byteLength ||
      totalSfntSize > MAX_FONT_SIZE ||
      WOFF_HEADER_SIZE + tableCount * WOFF_TABLE_ENTRY_SIZE > bytes.byteLength
    ) {
      throw new Error("Invalid WOFF dimensions");
    }

    const tables = new Map<number, Uint8Array>();
    for (let index = 0; index < tableCount; index += 1) {
      const entryOffset = WOFF_HEADER_SIZE + index * WOFF_TABLE_ENTRY_SIZE;
      const tag = readUint32(view, entryOffset);
      const offset = readUint32(view, entryOffset + 4);
      const compressedLength = readUint32(view, entryOffset + 8);
      const originalLength = readUint32(view, entryOffset + 12);
      if (
        originalLength > MAX_FONT_SIZE ||
        offset > bytes.byteLength ||
        compressedLength > bytes.byteLength - offset
      ) {
        throw new Error("Invalid WOFF table bounds");
      }
      const source = bytes.subarray(offset, offset + compressedLength);
      const table =
        compressedLength < originalLength
          ? unzlibSync(source)
          : new Uint8Array(source);
      if (table.byteLength !== originalLength) {
        throw new Error("Invalid WOFF table length");
      }
      if (tag === TAG_HEAD && table.byteLength >= 12) {
        const head = new Uint8Array(table);
        head.fill(0, 8, 12);
        tables.set(tag, head);
      } else {
        tables.set(tag, table);
      }
    }
    return buildSfnt(flavor, tables).ttf;
  }
}
