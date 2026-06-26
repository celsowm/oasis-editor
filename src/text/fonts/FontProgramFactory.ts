import type { PdfEmbeddableFont, TextLayouter } from "./core/types.js";
import { defaultFontDecoderRegistry } from "./decoders/FontDecoderRegistry.js";
import { OpenTypeLayouter } from "./layout/OpenTypeLayouter.js";
import { SimpleTextLayouter } from "./layout/SimpleTextLayouter.js";
import { SfntFontProgram } from "./sfnt/SfntFontProgram.js";
import { TrueTypePdfFontSubsetter } from "@/export/pdf/fonts/TrueTypePdfFontSubsetter.js";

export async function parseEmbeddedFont(
  sourceBytes: Uint8Array,
): Promise<SfntFontProgram> {
  const sfntBytes = await defaultFontDecoderRegistry.decode(sourceBytes);
  return SfntFontProgram.parse(sfntBytes);
}

export function parseEmbeddedFontSync(
  sourceBytes: Uint8Array,
): SfntFontProgram {
  const sfntBytes = defaultFontDecoderRegistry.decodeSync(sourceBytes);
  return SfntFontProgram.parse(sfntBytes);
}

export function createPdfEmbeddableFont(
  program: SfntFontProgram,
): PdfEmbeddableFont {
  // Use the OpenType layouter when the font can shape (GSUB substitution and/or
  // GPOS kerning); otherwise the 1:1 layouter (identical output, zero overhead).
  const shaper = new OpenTypeLayouter(program);
  const layouter: TextLayouter = shaper.hasShaping
    ? shaper
    : new SimpleTextLayouter(program);

  return {
    program,
    layouter,
    subsetter: new TrueTypePdfFontSubsetter(),
  };
}
