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

export interface OasisPdfPageSize {
  width: number;
  height: number;
}

export interface OasisPdfPage {
  width: number;
  height: number;
  commands: string[];
  imageResourceNames: Set<string>;
}

export interface OasisPdfRectOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  lineWidth?: number;
}

export interface OasisPdfLineOptions {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke?: string;
  lineWidth?: number;
  dashArray?: number[];
}

export type OasisPdfPathSegment =
  | { type: "move"; x: number; y: number }
  | { type: "line"; x: number; y: number }
  | {
      type: "cubic";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      x: number;
      y: number;
    }
  | { type: "close" };

export interface OasisPdfPathOptions {
  segments: OasisPdfPathSegment[];
  fill?: string;
  stroke?: string;
  lineWidth?: number;
}

export interface OasisPdfTextOptions {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  fontResourceName?: string;
  characterSpacing?: number;
  horizontalScale?: number;
}

export interface OasisPdfImageResource {
  resourceName: string;
  width: number;
  height: number;
  data: Uint8Array;
  filter: "DCTDecode";
}

export interface OasisPdfImageOptions {
  resourceName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export type OasisPdfFontResource =
  | OasisPdfBase14FontResource
  | OasisPdfUnicodeFontResource;

export interface OasisPdfBase14FontResource {
  kind: "base14";
  resourceName: string;
  baseFont: string;
}

export interface OasisPdfUnicodeFontResource {
  kind: "unicode";
  resourceName: string;
  family: string;
  fontData: Uint8Array;
  postscriptName?: string;
}

interface PdfObject {
  id: number;
  body: string;
}

interface OasisPdfUnicodeFontState {
  resource: OasisPdfUnicodeFontResource;
  font: PdfEmbeddableFont;
  usedGlyphs: Map<number, GlyphInfo>;
  scale: number;
  layoutCache: Map<string, GlyphRun>;
}

const PDF_HEADER = "%PDF-1.4\n% Oasis PDF\n";
const DEFAULT_PDF_FONT_RESOURCES: OasisPdfFontResource[] = [
  { kind: "base14", resourceName: "F1", baseFont: "Helvetica" },
  { kind: "base14", resourceName: "F2", baseFont: "Helvetica-Bold" },
  { kind: "base14", resourceName: "F3", baseFont: "Helvetica-Oblique" },
  { kind: "base14", resourceName: "F4", baseFont: "Helvetica-BoldOblique" },
];

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Number(value.toFixed(3)).toString();
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join("");
}

function toHex16(value: number): string {
  return Math.max(0, value)
    .toString(16)
    .padStart(4, "0")
    .slice(-4)
    .toUpperCase();
}

function colorToRgb(
  color: string | undefined,
  fallback: [number, number, number],
): [number, number, number] {
  if (!color) {
    return fallback;
  }

  const normalized = color.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return fallback;
  }

  return [
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
  ];
}

function colorCommand(
  color: string | undefined,
  operator: "rg" | "RG",
  fallback: [number, number, number],
): string {
  const [r, g, b] = colorToRgb(color, fallback);
  return `${formatNumber(r)} ${formatNumber(g)} ${formatNumber(b)} ${operator}`;
}

function resolveFontName(
  options: Pick<OasisPdfTextOptions, "bold" | "italic" | "fontResourceName">,
): string {
  if (options.fontResourceName) {
    return options.fontResourceName;
  }
  if (options.bold && options.italic) {
    return "F4";
  }
  if (options.bold) {
    return "F2";
  }
  if (options.italic) {
    return "F3";
  }
  return "F1";
}

function fontResourceObjectBody(resource: OasisPdfFontResource): string {
  switch (resource.kind) {
    case "base14":
      return `<< /Type /Font /Subtype /Type1 /BaseFont /${resource.baseFont} /Encoding /WinAnsiEncoding >>`;
    case "unicode":
      return "<< /Type /Font /Subtype /Type0 /BaseFont /OasisPending /Encoding /Identity-H >>";
  }
}

function sanitizePdfName(value: string | undefined, fallback: string): string {
  const normalized = (
    value && value.trim().length > 0 ? value : fallback
  ).replaceAll(" ", "_");
  return normalized.replace(/[^A-Za-z0-9_.+-]/g, "");
}

const WIN_ANSI_OVERRIDES = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

function encodeWinAnsiByte(char: string): number {
  const codePoint = char.codePointAt(0) ?? 0x3f;
  if (
    (codePoint >= 0x20 && codePoint <= 0x7e) ||
    (codePoint >= 0xa0 && codePoint <= 0xff)
  ) {
    return codePoint;
  }
  return WIN_ANSI_OVERRIDES.get(codePoint) ?? 0x3f;
}

function encodePdfHexString(value: string): string {
  return Array.from(value)
    .map((char) =>
      encodeWinAnsiByte(char).toString(16).padStart(2, "0").toUpperCase(),
    )
    .join("");
}

function encodePdfUtf16Hex(codePoints: number[]): string {
  const values: number[] = [];
  for (let value of codePoints) {
    if (value > 0xffff) {
      value -= 0x10000;
      values.push(((value >>> 10) & 0x3ff) | 0xd800);
      values.push((value & 0x3ff) | 0xdc00);
    } else {
      values.push(value);
    }
  }
  return values.map(toHex16).join("");
}

function buildToUnicodeCMap(unicode: number[][]): string {
  const entries = unicode
    .map((codePoints) => `<${encodePdfUtf16Hex(codePoints)}>`)
    .filter((entry) => entry !== "<>");
  if (entries.length === 0) {
    entries.push("<0000>");
  }

  const ranges: string[] = [];
  const chunkSize = 256;
  for (let start = 0; start < entries.length; start += chunkSize) {
    const end = Math.min(start + chunkSize, entries.length);
    ranges.push(
      `<${toHex16(start)}> <${toHex16(end - 1)}> [${entries.slice(start, end).join(" ")}]`,
    );
  }

  return [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CIDSystemInfo <<",
    "  /Registry (Adobe)",
    "  /Ordering (UCS)",
    "  /Supplement 0",
    ">> def",
    "/CMapName /Adobe-Identity-UCS def",
    "/CMapType 2 def",
    "1 begincodespacerange",
    "<0000><ffff>",
    "endcodespacerange",
    `${ranges.length} beginbfrange`,
    ranges.join("\n"),
    "endbfrange",
    "endcmap",
    "CMapName currentdict /CMap defineresource pop",
    "end",
    "end",
    "",
  ].join("\n");
}

function streamObjectBody(stream: string, extraDictionary = ""): string {
  const dictionary = extraDictionary
    ? ` /${extraDictionary.trim().replace(/^\/+/, "")}`
    : "";
  return `<< /Length ${byteLength(stream)}${dictionary} >>\nstream\n${stream}endstream`;
}

function asciiHexStreamObjectBody(
  bytes: Uint8Array,
  extraDictionary = "",
): string {
  const stream = `${bytesToHex(bytes)}>`;
  const dictionary = extraDictionary
    ? ` /${extraDictionary.trim().replace(/^\/+/, "")}`
    : "";
  return `<< /Length ${byteLength(stream)} /Filter /ASCIIHexDecode${dictionary} >>\nstream\n${stream}\nendstream`;
}

function asciiHexImageStreamObjectBody(
  bytes: Uint8Array,
  dictionaryEntries: string[],
): string {
  const stream = `${bytesToHex(bytes)}>`;
  return [
    `<< /Length ${byteLength(stream)}`,
    " /Filter [/ASCIIHexDecode /DCTDecode]",
    ` ${dictionaryEntries.join(" ")}`,
    " >>",
    "stream",
    stream,
    "endstream",
  ].join("\n");
}

function encodeGlyphHex(glyphId: number): string {
  return toHex16(glyphId);
}

function textMarkerComment(value: string): string {
  const codePoints = Array.from(value).map(
    (char) => char.codePointAt(0) ?? 0xfffd,
  );
  return `% OasisText ${encodePdfUtf16Hex(codePoints)}`;
}

export class OasisPdfWriter {
  private readonly pages: OasisPdfPage[] = [];
  private readonly fontResources = new Map<string, OasisPdfFontResource>();
  private readonly unicodeFontStates = new Map<
    string,
    OasisPdfUnicodeFontState
  >();
  private readonly usedFontResourceNames = new Set<string>();
  private readonly imageResources = new Map<string, OasisPdfImageResource>();

  constructor(
    fontResources: OasisPdfFontResource[] = DEFAULT_PDF_FONT_RESOURCES,
  ) {
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

  addPage(size: OasisPdfPageSize): number {
    this.pages.push({
      width: Math.max(1, size.width),
      height: Math.max(1, size.height),
      commands: [],
      imageResourceNames: new Set(),
    });
    return this.pages.length - 1;
  }

  getPageCount(): number {
    return this.pages.length;
  }

  drawRect(pageIndex: number, options: OasisPdfRectOptions): void {
    const page = this.pages[pageIndex];
    if (!page || options.width <= 0 || options.height <= 0) {
      return;
    }

    const commands = ["q"];
    if (options.fill) {
      commands.push(colorCommand(options.fill, "rg", [1, 1, 1]));
    }
    if (options.stroke) {
      commands.push(colorCommand(options.stroke, "RG", [0, 0, 0]));
      commands.push(`${formatNumber(options.lineWidth ?? 1)} w`);
    }

    commands.push(
      [
        formatNumber(options.x),
        formatNumber(page.height - options.y - options.height),
        formatNumber(options.width),
        formatNumber(options.height),
        "re",
      ].join(" "),
    );

    if (options.fill && options.stroke) {
      commands.push("B");
    } else if (options.fill) {
      commands.push("f");
    } else if (options.stroke) {
      commands.push("S");
    }
    commands.push("Q");
    page.commands.push(commands.join("\n"));
  }

  drawLine(pageIndex: number, options: OasisPdfLineOptions): void {
    const page = this.pages[pageIndex];
    if (!page) {
      return;
    }

    const dashCommand =
      options.dashArray && options.dashArray.length > 0
        ? `[${options.dashArray.map((value) => formatNumber(value)).join(" ")}] 0 d`
        : null;

    const commands: string[] = [
      "q",
      colorCommand(options.stroke, "RG", [0, 0, 0]),
    ];
    if (dashCommand) {
      commands.push(dashCommand);
    }
    commands.push(
      `${formatNumber(options.lineWidth ?? 1)} w`,
      `${formatNumber(options.x1)} ${formatNumber(page.height - options.y1)} m`,
      `${formatNumber(options.x2)} ${formatNumber(page.height - options.y2)} l`,
      "S",
      "Q",
    );
    page.commands.push(commands.join("\n"));
  }

  // Fills/strokes an arbitrary path. Segment coordinates are in points with a
  // top-left origin (callers convert px→pt, like drawRect/drawLine); the y axis
  // is flipped here to the PDF bottom-left origin.
  drawPath(pageIndex: number, options: OasisPdfPathOptions): void {
    const page = this.pages[pageIndex];
    if (!page || options.segments.length === 0) {
      return;
    }
    if (!options.fill && !options.stroke) {
      return;
    }

    const flip = (yy: number): number => page.height - yy;
    const commands = ["q"];
    if (options.fill) {
      commands.push(colorCommand(options.fill, "rg", [1, 1, 1]));
    }
    if (options.stroke) {
      commands.push(colorCommand(options.stroke, "RG", [0, 0, 0]));
      commands.push(`${formatNumber(options.lineWidth ?? 1)} w`);
    }

    for (const segment of options.segments) {
      switch (segment.type) {
        case "move":
          commands.push(
            `${formatNumber(segment.x)} ${formatNumber(flip(segment.y))} m`,
          );
          break;
        case "line":
          commands.push(
            `${formatNumber(segment.x)} ${formatNumber(flip(segment.y))} l`,
          );
          break;
        case "cubic":
          commands.push(
            `${formatNumber(segment.x1)} ${formatNumber(flip(segment.y1))} ` +
              `${formatNumber(segment.x2)} ${formatNumber(flip(segment.y2))} ` +
              `${formatNumber(segment.x)} ${formatNumber(flip(segment.y))} c`,
          );
          break;
        case "close":
          commands.push("h");
          break;
      }
    }

    if (options.fill && options.stroke) {
      commands.push("B");
    } else if (options.fill) {
      commands.push("f");
    } else {
      commands.push("S");
    }
    commands.push("Q");
    page.commands.push(commands.join("\n"));
  }

  // Saves the graphics state (`q`). Pair with restoreGraphicsState. Any draw
  // commands emitted in between inherit the current transform/clip.
  saveGraphicsState(pageIndex: number): void {
    const page = this.pages[pageIndex];
    if (page) {
      page.commands.push("q");
    }
  }

  restoreGraphicsState(pageIndex: number): void {
    const page = this.pages[pageIndex];
    if (page) {
      page.commands.push("Q");
    }
  }

  // Concatenates a clockwise rotation (in degrees, matching the canvas/editor
  // convention) about a top-left-origin point onto the current CTM. Must sit
  // inside a saveGraphicsState/restoreGraphicsState pair.
  rotateAbout(
    pageIndex: number,
    centerX: number,
    centerY: number,
    degrees: number,
  ): void {
    const page = this.pages[pageIndex];
    if (!page || !degrees) {
      return;
    }
    const cyf = page.height - centerY;
    const radians = (-degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const e = centerX - centerX * cos + cyf * sin;
    const f = cyf - centerX * sin - cyf * cos;
    page.commands.push(
      `${formatNumber(cos)} ${formatNumber(sin)} ${formatNumber(-sin)} ` +
        `${formatNumber(cos)} ${formatNumber(e)} ${formatNumber(f)} cm`,
    );
  }

  // Intersects the clip path with a rectangle (top-left origin). Must sit inside
  // a saveGraphicsState/restoreGraphicsState pair so the clip can be undone.
  clipRect(
    pageIndex: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const page = this.pages[pageIndex];
    if (!page || width <= 0 || height <= 0) {
      return;
    }
    page.commands.push(
      `${formatNumber(x)} ${formatNumber(page.height - y - height)} ` +
        `${formatNumber(width)} ${formatNumber(height)} re`,
      "W",
      "n",
    );
  }

  drawText(pageIndex: number, options: OasisPdfTextOptions): void {
    const page = this.pages[pageIndex];
    if (!page || options.text.length === 0) {
      return;
    }

    const fontResourceName = resolveFontName(options);
    this.usedFontResourceNames.add(fontResourceName);
    const unicodeFont = this.unicodeFontStates.get(fontResourceName);
    if (unicodeFont) {
      this.drawUnicodeText(page, unicodeFont, options);
      return;
    }

    page.commands.push(
      [
        textMarkerComment(options.text),
        "BT",
        colorCommand(options.color, "rg", [0, 0, 0]),
        `/${fontResourceName} ${formatNumber(options.fontSize ?? 12)} Tf`,
        ...(options.horizontalScale &&
        options.horizontalScale > 0 &&
        options.horizontalScale !== 100
          ? [`${formatNumber(options.horizontalScale)} Tz`]
          : []),
        ...(options.characterSpacing && options.characterSpacing !== 0
          ? [`${formatNumber(options.characterSpacing)} Tc`]
          : []),
        `${formatNumber(options.x)} ${formatNumber(page.height - options.y)} Td`,
        `<${encodePdfHexString(options.text)}> Tj`,
        "ET",
      ].join("\n"),
    );
  }

  registerImageResource(
    resource: Omit<OasisPdfImageResource, "resourceName"> & {
      resourceName?: string;
    },
  ): string {
    const resourceName =
      resource.resourceName ?? `Im${this.imageResources.size + 1}`;
    if (!this.imageResources.has(resourceName)) {
      this.imageResources.set(resourceName, {
        resourceName,
        width: Math.max(1, Math.round(resource.width)),
        height: Math.max(1, Math.round(resource.height)),
        data: resource.data,
        filter: resource.filter,
      });
    }
    return resourceName;
  }

  drawImage(pageIndex: number, options: OasisPdfImageOptions): void {
    const page = this.pages[pageIndex];
    if (
      !page ||
      options.width <= 0 ||
      options.height <= 0 ||
      !this.imageResources.has(options.resourceName)
    ) {
      return;
    }

    page.imageResourceNames.add(options.resourceName);
    const bottom = page.height - options.y - options.height;
    const rotation = Number.isFinite(options.rotation)
      ? (options.rotation ?? 0)
      : 0;
    if (rotation === 0) {
      page.commands.push(
        [
          "q",
          [
            formatNumber(options.width),
            "0",
            "0",
            formatNumber(options.height),
            formatNumber(options.x),
            formatNumber(bottom),
            "cm",
          ].join(" "),
          `/${options.resourceName} Do`,
          "Q",
        ].join("\n"),
      );
      return;
    }

    // Match the canvas/editor model: positive degrees rotate the image
    // clockwise visually around the box center, while PDF's math-space uses
    // counter-clockwise positive angles.
    const radians = (-rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const a = options.width * cos;
    const b = options.width * sin;
    const c = -options.height * sin;
    const d = options.height * cos;
    const e = options.x + options.width / 2 - 0.5 * a - 0.5 * c;
    const f = bottom + options.height / 2 - 0.5 * b - 0.5 * d;
    page.commands.push(
      [
        "q",
        [
          formatNumber(a),
          formatNumber(b),
          formatNumber(c),
          formatNumber(d),
          formatNumber(e),
          formatNumber(f),
          "cm",
        ].join(" "),
        `/${options.resourceName} Do`,
        "Q",
      ].join("\n"),
    );
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

  private drawUnicodeText(
    page: OasisPdfPage,
    state: OasisPdfUnicodeFontState,
    options: OasisPdfTextOptions,
  ): void {
    const run = this.layoutUnicodeText(state, options.text);
    const encoded = this.encodeUnicodeGlyphRun(state, run);
    if (encoded.length === 0) {
      return;
    }

    const usesAdjustments = encoded.some(
      (glyph) => Math.abs(glyph.nominalWidth - glyph.desiredAdvance) > 0.01,
    );
    const textCommand = usesAdjustments
      ? `[${encoded
          .map((glyph) => {
            const adjustment = glyph.nominalWidth - glyph.desiredAdvance;
            return adjustment === 0
              ? `<${encodeGlyphHex(glyph.glyphId)}>`
              : `<${encodeGlyphHex(glyph.glyphId)}> ${formatNumber(adjustment)}`;
          })
          .join(" ")}] TJ`
      : `<${encoded.map((glyph) => encodeGlyphHex(glyph.glyphId)).join("")}> Tj`;

    page.commands.push(
      [
        textMarkerComment(options.text),
        "BT",
        colorCommand(options.color, "rg", [0, 0, 0]),
        `/${state.resource.resourceName} ${formatNumber(options.fontSize ?? 12)} Tf`,
        ...(options.horizontalScale &&
        options.horizontalScale > 0 &&
        options.horizontalScale !== 100
          ? [`${formatNumber(options.horizontalScale)} Tz`]
          : []),
        ...(options.characterSpacing && options.characterSpacing !== 0
          ? [`${formatNumber(options.characterSpacing)} Tc`]
          : []),
        `${formatNumber(options.x)} ${formatNumber(page.height - options.y)} Td`,
        textCommand,
        "ET",
      ].join("\n"),
    );
  }

  toArrayBuffer(): ArrayBuffer {
    const bytes = this.toUint8Array();
    return Uint8Array.from(bytes).buffer;
  }

  toBlob(): Blob {
    return new Blob([this.toArrayBuffer()], { type: "application/pdf" });
  }

  private toUint8Array(): Uint8Array {
    if (this.pages.length === 0) {
      this.addPage({ width: 612, height: 792 });
    }

    const objects: PdfObject[] = [];
    const addObject = (body: string): number => {
      const id = objects.length + 1;
      objects.push({ id, body });
      return id;
    };

    const catalogObjectId = addObject("");
    const pagesObjectId = addObject("");
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
    const fontResourceXml = fontResourceEntries
      .map((font, index) => `/${font.resourceName} ${fontObjectIds[index]} 0 R`)
      .join(" ");
    const imageObjectIds = new Map<string, number>();
    for (const image of this.imageResources.values()) {
      imageObjectIds.set(
        image.resourceName,
        this.addImageObject(image, addObject),
      );
    }
    const pageObjectIds: number[] = [];

    for (const page of this.pages) {
      const stream = `${page.commands.join("\n")}\n`;
      const contentObjectId = addObject(
        `<< /Length ${byteLength(stream)} >>\nstream\n${stream}endstream`,
      );
      const imageResourceXml = Array.from(page.imageResourceNames)
        .map((resourceName) => {
          const objectId = imageObjectIds.get(resourceName);
          return objectId ? `/${resourceName} ${objectId} 0 R` : "";
        })
        .filter(Boolean)
        .join(" ");
      const xObjectResourceXml = imageResourceXml
        ? ` /XObject << ${imageResourceXml} >>`
        : "";
      const pageObjectId = addObject(
        [
          "<< /Type /Page",
          `/Parent ${pagesObjectId} 0 R`,
          `/MediaBox [0 0 ${formatNumber(page.width)} ${formatNumber(page.height)}]`,
          `/Resources << /Font << ${fontResourceXml} >>${xObjectResourceXml} >>`,
          `/Contents ${contentObjectId} 0 R`,
          ">>",
        ].join("\n"),
      );
      pageObjectIds.push(pageObjectId);
    }

    objects[catalogObjectId - 1]!.body =
      `<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`;
    objects[pagesObjectId - 1]!.body = [
      "<< /Type /Pages",
      `/Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}]`,
      `/Count ${pageObjectIds.length}`,
      ">>",
    ].join("\n");

    let body = PDF_HEADER;
    const offsets: number[] = [0];
    for (const object of objects) {
      offsets[object.id] = byteLength(body);
      body += `${object.id} 0 obj\n${object.body}\nendobj\n`;
    }

    const xrefOffset = byteLength(body);
    body += `xref\n0 ${objects.length + 1}\n`;
    body += "0000000000 65535 f \n";
    for (const object of objects) {
      body += `${String(offsets[object.id] ?? 0).padStart(10, "0")} 00000 n \n`;
    }
    body += [
      "trailer",
      `<< /Size ${objects.length + 1} /Root ${catalogObjectId} 0 R >>`,
      "startxref",
      String(xrefOffset),
      "%%EOF",
      "",
    ].join("\n");

    return new TextEncoder().encode(body);
  }

  private addImageObject(
    resource: OasisPdfImageResource,
    addObject: (body: string) => number,
  ): number {
    return addObject(
      asciiHexImageStreamObjectBody(resource.data, [
        "/Type /XObject",
        "/Subtype /Image",
        `/Width ${resource.width}`,
        `/Height ${resource.height}`,
        "/ColorSpace /DeviceRGB",
        "/BitsPerComponent 8",
      ]),
    );
  }

  private addUnicodeFontObjects(
    state: OasisPdfUnicodeFontState,
    addObject: (body: string) => number,
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
