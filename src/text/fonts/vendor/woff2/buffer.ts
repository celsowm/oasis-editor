/**
 * Lightweight byte reader with bounds checks used by the WOFF2 decoder.
 */
export class Buf {
  constructor(private readonly data: Uint8Array, public offset = 0) {}

  get length(): number {
    return this.data.length;
  }

  peekRemaining(): Uint8Array {
    return this.data.subarray(this.offset);
  }

  readU8(): number {
    if (this.offset + 1 > this.data.length) {
      throw new Error("Unexpected EOF");
    }
    return this.data[this.offset++];
  }

  readU16(): number {
    if (this.offset + 2 > this.data.length) {
      throw new Error("Unexpected EOF");
    }
    const v = (this.data[this.offset] << 8) | (this.data[this.offset + 1] & 0xff);
    this.offset += 2;
    return v;
  }

  readS16(): number {
    const v = this.readU16();
    return v & 0x8000 ? v - 0x10000 : v;
  }

  readU32(): number {
    if (this.offset + 4 > this.data.length) {
      throw new Error("Unexpected EOF");
    }
    const v =
      (this.data[this.offset] << 24) |
      (this.data[this.offset + 1] << 16) |
      (this.data[this.offset + 2] << 8) |
      this.data[this.offset + 3];
    this.offset += 4;
    return v >>> 0;
  }

  readBytes(n: number): Uint8Array {
    if (this.offset + n > this.data.length) {
      throw new Error("Unexpected EOF");
    }
    const slice = this.data.subarray(this.offset, this.offset + n);
    this.offset += n;
    return slice;
  }

  skip(n: number): void {
    if (this.offset + n > this.data.length) {
      throw new Error("Unexpected EOF");
    }
    this.offset += n;
  }
}

/**
 * Read a Base128 variable-length integer.
 */
export function readBase128(buf: Buf): number {
  let result = 0;
  for (let i = 0; i < 5; i++) {
    const code = buf.readU8();
    if (i === 0 && code === 0x80) {
      throw new Error("Invalid Base128: leading zero");
    }
    if (result & 0xfe000000) {
      throw new Error("Base128 overflow");
    }
    result = (result << 7) | (code & 0x7f);
    if ((code & 0x80) === 0) {
      return result >>> 0;
    }
  }
  throw new Error("Base128 exceeds 5 bytes");
}

/**
 * Read a 255UInt16 as defined in the WOFF2 spec.
 */
export function read255UShort(buf: Buf): number {
  const code = buf.readU8();
  const LOWEST_UCODE = 253;
  if (code === 253) {
    // Next 2 bytes are the full value
    return buf.readU16();
  }
  if (code === 255) {
    // One extra byte, offset by 253
    return LOWEST_UCODE + buf.readU8();
  }
  if (code === 254) {
    // One extra byte, offset by 2 * 253 = 506
    return LOWEST_UCODE * 2 + buf.readU8();
  }
  return code;
}
