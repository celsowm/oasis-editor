import type { FontDecoder } from "@/text/fonts/core/types.js";

export class TtfDecoder implements FontDecoder {
  readonly format = "ttf" as const;

  canDecode(bytes: Uint8Array): boolean {
    if (bytes.byteLength < 4) return false;
    const signature =
      (bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!;
    return signature === 0x00010000 || signature === 0x4f54544f;
  }

  decode(bytes: Uint8Array): Promise<Uint8Array> {
    return Promise.resolve(this.decodeSync(bytes));
  }

  decodeSync(bytes: Uint8Array): Uint8Array {
    return new Uint8Array(bytes);
  }
}
