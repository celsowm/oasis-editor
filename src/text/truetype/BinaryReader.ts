import { TrueTypeParseError } from "./TrueTypeParseError.js";

/**
 * A forward/seekable cursor over a byte buffer that reads big-endian integers.
 *
 * The sfnt container (TrueType/OpenType) is always big-endian, so every
 * multi-byte read goes through `DataView`, whose getters are big-endian by
 * default. Reading multi-byte values via typed-array views over the raw buffer
 * would adopt the host's endianness — the single most common font-parsing bug —
 * so this reader never does that.
 */
export class BinaryReader {
  private readonly view: DataView;
  private cursor = 0;

  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  get length(): number {
    return this.bytes.byteLength;
  }

  tell(): number {
    return this.cursor;
  }

  seek(offset: number): void {
    if (offset < 0 || offset > this.bytes.byteLength) {
      throw new TrueTypeParseError(
        `seek out of range: ${offset} (length ${this.bytes.byteLength})`,
      );
    }
    this.cursor = offset;
  }

  skip(byteCount: number): void {
    this.seek(this.cursor + byteCount);
  }

  private ensure(byteCount: number): void {
    if (this.cursor + byteCount > this.bytes.byteLength) {
      throw new TrueTypeParseError(
        `unexpected end of font data at ${this.cursor} (+${byteCount}, length ${this.bytes.byteLength})`,
      );
    }
  }

  u8(): number {
    this.ensure(1);
    return this.view.getUint8(this.cursor++);
  }

  u16(): number {
    this.ensure(2);
    const value = this.view.getUint16(this.cursor);
    this.cursor += 2;
    return value;
  }

  i16(): number {
    this.ensure(2);
    const value = this.view.getInt16(this.cursor);
    this.cursor += 2;
    return value;
  }

  u32(): number {
    this.ensure(4);
    const value = this.view.getUint32(this.cursor);
    this.cursor += 4;
    return value;
  }

  /** Reads a 4-byte sfnt tag as an ASCII string (e.g. "cmap", "head"). */
  tag(): string {
    this.ensure(4);
    let result = "";
    for (let index = 0; index < 4; index += 1) {
      result += String.fromCharCode(this.view.getUint8(this.cursor + index));
    }
    this.cursor += 4;
    return result;
  }

  /** Absolute (non-advancing) big-endian uint16 read. */
  u16At(offset: number): number {
    if (offset < 0 || offset + 2 > this.bytes.byteLength) {
      throw new TrueTypeParseError(`u16 read out of range at ${offset}`);
    }
    return this.view.getUint16(offset);
  }
}
