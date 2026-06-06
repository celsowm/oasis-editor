import type { PdfEmbeddableFont } from "./core/types.js";
import { defaultFontDecoderRegistry } from "./decoders/FontDecoderRegistry.js";
import { SimpleTextLayouter } from "./layout/SimpleTextLayouter.js";
import { SfntFontProgram } from "./sfnt/SfntFontProgram.js";
import { TrueTypePdfFontSubsetter } from "../../export/pdf/fonts/TrueTypePdfFontSubsetter.js";

export async function parseEmbeddedFont(
  sourceBytes: Uint8Array,
): Promise<SfntFontProgram> {
  const sfntBytes = await defaultFontDecoderRegistry.decode(sourceBytes);
  return SfntFontProgram.parse(sfntBytes);
}

export function parseEmbeddedFontSync(sourceBytes: Uint8Array): SfntFontProgram {
  const sfntBytes = defaultFontDecoderRegistry.decodeSync(sourceBytes);
  return SfntFontProgram.parse(sfntBytes);
}

export function createPdfEmbeddableFont(
  program: SfntFontProgram,
): PdfEmbeddableFont {
  return {
    program,
    layouter: new SimpleTextLayouter(program),
    subsetter: new TrueTypePdfFontSubsetter(),
  };
}
