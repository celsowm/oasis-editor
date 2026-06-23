/**
 * Owns the writer's font resources: base-14 fonts plus embedded Unicode faces
 * (parsing, glyph subsetting, and the indirect PDF objects they serialize to).
 * The content stream asks it to resolve a run's font and build the glyph-show
 * command; the serializer asks it to emit the font objects and resource map.
 */
import type {
  GlyphInfo,
  GlyphPosition,
  GlyphRun,
  PdfEmbeddableFont,
} from "@/text/fonts/core/types.js";
import {
  createPdfEmbeddableFont,
  parseEmbeddedFontSync,
} from "@/text/fonts/FontProgramFactory.js";
import type {
  AddPdfObject,
  OasisPdfFontResource,
  OasisPdfTextOptions,
  OasisPdfUnicodeFontResource,
} from "./pdfTypes.js";
import {
  asciiHexStreamObjectBody,
  buildToUnicodeCMap,
  encodeGlyphHex,
  fontResourceObjectBody,
  formatNumber,
  resolveFontName,
  sanitizePdfName,
  streamObjectBody,
} from "./pdfPrimitives.js";

interface OasisPdfUnicodeFontState {
  resource: OasisPdfUnicodeFontResource;
  font: PdfEmbeddableFont;
  usedGlyphs: Map<number, GlyphInfo>;
  scale: number;
  layoutCache: Map<string, GlyphRun>;
}

export class PdfFontTable {
  private readonly fontResources = new Map<string, OasisPdfFontResource>();
  private readonly unicodeFontStates = new Map<
    string,
    OasisPdfUnicodeFontState
  >();
  private readonly usedFontResourceNames = new Set<string>();

  constructor(fontResources: OasisPdfFontResource[]) {
    for (const resource of fontResources) {
      this.registerFontResource(resource);
    }
  }

  registerFontResource(resource: OasisPdfFontResource): void {
    this.fontResources.set(resource.resourceName, resource);
    if (
      resource.kind === "unicode" &&
      !this.unicodeFontStates.has(resource.resourceName)
    ) {
      const font = createPdfEmbeddableFont(
        parseEmbeddedFontSync(resource.fontData),
      );
      const scale = 1000 / font.program.unitsPerEm;
      const notdef: GlyphInfo = {
        id: 0,
        codePoints: [0],
        advanceWidth: font.program.advanceWidthForGlyph(0),
      };
      this.unicodeFontStates.set(resource.resourceName, {
        resource,
        font,
        usedGlyphs: new Map([[0, notdef]]),
        scale,
        layoutCache: new Map(),
      });
    }
  }

  /** Resolves the font resource a run uses and marks it as referenced. */
  resolveAndMarkFontName(
    options: Pick<OasisPdfTextOptions, "bold" | "italic" | "fontResourceName">,
  ): string {
    const fontResourceName = resolveFontName(options);
    this.usedFontResourceNames.add(fontResourceName);
    return fontResourceName;
  }

  getUnicodeState(resourceName: string): OasisPdfUnicodeFontState | undefined {
    return this.unicodeFontStates.get(resourceName);
  }

  /**
   * Builds the glyph-show operator (`<...> Tj` or `[...] TJ`) for an embedded
   * Unicode run, recording the glyphs used for subsetting. Returns `null` when
   * the run produced no glyphs so the caller can skip emission entirely.
   */
  buildUnicodeShowCommand(
    state: OasisPdfUnicodeFontState,
    text: string,
  ): string | null {
    const run = this.layoutUnicodeText(state, text);
    const encoded = this.encodeUnicodeGlyphRun(state, run);
    if (encoded.length === 0) {
      return null;
    }

    const usesAdjustments = encoded.some(
      (glyph) => Math.abs(glyph.nominalWidth - glyph.desiredAdvance) > 0.01,
    );
    return usesAdjustments
      ? `[${encoded
          .map((glyph) => {
            const adjustment = glyph.nominalWidth - glyph.desiredAdvance;
            return adjustment === 0
              ? `<${encodeGlyphHex(glyph.glyphId)}>`
              : `<${encodeGlyphHex(glyph.glyphId)}> ${formatNumber(adjustment)}`;
          })
          .join(" ")}] TJ`
      : `<${encoded.map((glyph) => encodeGlyphHex(glyph.glyphId)).join("")}> Tj`;
  }

  /**
   * Emits the font objects (base-14 dictionaries and embedded Unicode font
   * programs) for every referenced resource and returns the `/Font` resource
   * dictionary XML for page objects.
   */
  buildFontObjects(addObject: AddPdfObject): { resourceXml: string } {
    const fontResourceEntries = Array.from(this.fontResources.values()).filter(
      (resource) =>
        resource.kind === "base14" ||
        this.usedFontResourceNames.has(resource.resourceName),
    );
    const fontObjectIds = fontResourceEntries.map((font) => {
      if (font.kind === "unicode") {
        const state = this.unicodeFontStates.get(font.resourceName);
        if (state) {
          return this.addUnicodeFontObjects(state, addObject);
        }
      }
      return addObject(fontResourceObjectBody(font));
    });
    const resourceXml = fontResourceEntries
      .map((font, index) => `/${font.resourceName} ${fontObjectIds[index]} 0 R`)
      .join(" ");
    return { resourceXml };
  }

  private layoutUnicodeText(
    state: OasisPdfUnicodeFontState,
    text: string,
  ): GlyphRun {
    const cached = state.layoutCache.get(text);
    if (cached) {
      return cached;
    }
    const run = state.font.layouter.layout(text);
    state.layoutCache.set(text, run);
    return run;
  }

  private encodeUnicodeGlyphRun(
    state: OasisPdfUnicodeFontState,
    run: GlyphRun,
  ): Array<{ glyphId: number; nominalWidth: number; desiredAdvance: number }> {
    return run.glyphs.map((glyph: GlyphInfo, index: number) => {
      if (!state.usedGlyphs.has(glyph.id)) {
        state.usedGlyphs.set(glyph.id, glyph);
      }
      const position: GlyphPosition | undefined = run.positions[index];
      const nominalWidth = glyph.advanceWidth * state.scale;
      const desiredAdvance =
        (position?.xAdvance ?? glyph.advanceWidth) * state.scale;
      return { glyphId: glyph.id, nominalWidth, desiredAdvance };
    });
  }

  private addUnicodeFontObjects(
    state: OasisPdfUnicodeFontState,
    addObject: AddPdfObject,
  ): number {
    const subset = state.font.subsetter.createSubset(
      state.font.program,
      state.usedGlyphs.values(),
    );
    const subsetBytes = subset.fontFile;
    const fontFileObjectId = addObject(asciiHexStreamObjectBody(subsetBytes));

    const metadata = state.font.program.metadata;
    const familyClass = metadata.familyClass >> 8 || 0;
    let flags = 1 << 2;
    if (metadata.isFixedPitch) {
      flags |= 1 << 0;
    }
    if (familyClass >= 1 && familyClass <= 7) {
      flags |= 1 << 1;
    }
    if (familyClass === 10) {
      flags |= 1 << 3;
    }
    if (metadata.macStyleItalic) {
      flags |= 1 << 6;
    }

    const tag = sanitizePdfName(
      `${state.resource.resourceName}AAAAAA`,
      "OASISF",
    )
      .slice(0, 6)
      .padEnd(6, "A");
    const baseFont = `${tag}+${sanitizePdfName(metadata.postscriptName, state.resource.family)}`;
    const bbox = metadata.bbox;
    const fontDescriptorObjectId = addObject(
      [
        "<< /Type /FontDescriptor",
        `/FontName /${baseFont}`,
        `/Flags ${flags}`,
        `/FontBBox [${[
          bbox.minX * state.scale,
          bbox.minY * state.scale,
          bbox.maxX * state.scale,
          bbox.maxY * state.scale,
        ]
          .map(formatNumber)
          .join(" ")}]`,
        `/ItalicAngle ${formatNumber(metadata.italicAngle)}`,
        `/Ascent ${formatNumber(metadata.ascent * state.scale)}`,
        `/Descent ${formatNumber(metadata.descent * state.scale)}`,
        `/CapHeight ${formatNumber(metadata.capHeight * state.scale)}`,
        `/XHeight ${formatNumber(metadata.xHeight * state.scale)}`,
        "/StemV 0",
        `/FontFile2 ${fontFileObjectId} 0 R`,
        ">>",
      ].join("\n"),
    );

    const descendantFontObjectId = addObject(
      [
        "<< /Type /Font",
        "/Subtype /CIDFontType2",
        `/BaseFont /${baseFont}`,
        "/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >>",
        `/FontDescriptor ${fontDescriptorObjectId} 0 R`,
        `/W [0 [${subset.widths.map((width) => formatNumber(width ?? 0)).join(" ")}]]`,
        "/CIDToGIDMap /Identity",
        ">>",
      ]
        .filter(Boolean)
        .join("\n"),
    );

    const toUnicodeStream = buildToUnicodeCMap(subset.unicode);
    const toUnicodeObjectId = addObject(streamObjectBody(toUnicodeStream));

    return addObject(
      [
        "<< /Type /Font",
        "/Subtype /Type0",
        `/BaseFont /${baseFont}`,
        "/Encoding /Identity-H",
        `/DescendantFonts [${descendantFontObjectId} 0 R]`,
        `/ToUnicode ${toUnicodeObjectId} 0 R`,
        ">>",
      ].join("\n"),
    );
  }
}
