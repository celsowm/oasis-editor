import type { FontDecoder } from "@/text/fonts/core/types.js";
import { TtfDecoder } from "./TtfDecoder.js";
import { Woff2Decoder } from "./Woff2Decoder.js";

export class FontDecoderRegistry {
  constructor(private readonly decoders: FontDecoder[]) {}

  decode(bytes: Uint8Array): Promise<Uint8Array> {
    const decoder = this.resolve(bytes);
    return decoder.decode(bytes);
  }

  decodeSync(bytes: Uint8Array): Uint8Array {
    const decoder = this.resolve(bytes);
    if (!decoder.decodeSync) {
      throw new Error(`Font decoder "${decoder.format}" is not synchronous`);
    }
    return decoder.decodeSync(bytes);
  }

  private resolve(bytes: Uint8Array): FontDecoder {
    const decoder = this.decoders.find((candidate) =>
      candidate.canDecode(bytes),
    );
    if (!decoder) {
      throw new Error("Unsupported font format");
    }
    return decoder;
  }
}

export const defaultFontDecoderRegistry = new FontDecoderRegistry([
  new Woff2Decoder(),
  new TtfDecoder(),
]);
