/**
 * Public value/option types for the PDF writer. These are the interfaces that
 * callers across `src/export/pdf` (and the font registry) depend on; the
 * `OasisPdfWriter` facade re-exports them so existing import paths keep working.
 */

export interface OasisPdfPageSize {
  width: number;
  height: number;
}

export interface OasisPdfPage {
  width: number;
  height: number;
  commands: string[];
  imageResourceNames: Set<string>;
  shadingResourceNames: Set<string>;
}

/** One color stop of an axial gradient. `offset` is 0–1; `color` is a hex string. */
export interface OasisPdfGradientStop {
  offset: number;
  color: string;
}

/**
 * An axial (linear) gradient fill, in the writer's top-left-origin point space.
 * `(x0,y0)→(x1,y1)` is the gradient axis; the content stream flips y to PDF space
 * and the shading extends its end colors beyond the axis.
 */
export interface OasisPdfAxialGradient {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  stops: OasisPdfGradientStop[];
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
  /** PDF text render mode (`Tr`): 0 fill (default), 1 stroke, 2 fill+stroke. */
  renderMode?: number;
  /** Stroke color for render modes 1 (stroke) and 2 (fill+stroke). Defaults to `color`. */
  strokeColor?: string;
  /** Stroke line width in pt for render modes 1 and 2. Defaults to 3% of fontSize. */
  strokeWidth?: number;
  /**
   * OpenType GSUB feature tags to apply when shaping this run with an embedded
   * Unicode font (e.g. `["liga", "onum", "ss01"]`). Ignored by base-14 fonts.
   */
  fontFeatures?: readonly string[];
  /**
   * Resource name of an axial-gradient shading (from `registerAxialGradient`).
   * When set, the glyphs are used as a clip path and the gradient is painted
   * through them (`w14:textFill` gradient), so `color`/`renderMode` are ignored.
   */
  gradientShadingName?: string;
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

/** A serialized indirect PDF object: its 1-based id and dictionary/stream body. */
export interface PdfObject {
  id: number;
  body: string;
}

/** Signature of the object-appending closure used during serialization. */
export type AddPdfObject = (body: string) => number;
