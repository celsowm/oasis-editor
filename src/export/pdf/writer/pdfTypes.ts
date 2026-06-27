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
  annotations: OasisPdfAnnotation[];
}

/**
 * A clickable link annotation. The rect is given in the writer's top-left point
 * space (same convention as drawing); the serializer flips y to PDF bottom-left
 * space and emits the `[x1 y1 x2 y2]` `/Rect`. Exactly one of `uri` (external)
 * or `destName` (internal named destination) is set.
 */
export interface OasisPdfLinkAnnotation {
  x: number;
  y: number;
  width: number;
  height: number;
  /** External target (`/URI` action). */
  uri?: string;
  /** Internal target: a named destination resolved via the `/Dests` name tree. */
  destName?: string;
}

export type OasisPdfAnnotation = OasisPdfLinkAnnotation;

/**
 * A named destination (a jump target for internal links / the outline). Position
 * is in the writer's top-left point space; the serializer flips y and binds it to
 * the page object as a `/XYZ` destination.
 */
export interface OasisPdfNamedDestination {
  name: string;
  pageIndex: number;
  x: number;
  y: number;
}

/**
 * One entry in the document outline (bookmarks panel). Items are supplied in
 * document order; the serializer folds them into a nested tree by `level` (1 =
 * top level). `destName` references a registered named destination.
 */
export interface OasisPdfOutlineItem {
  title: string;
  level: number;
  destName: string;
}

/** Document information dictionary (`/Info`). All fields optional. */
export interface OasisPdfDocumentInfo {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  producer?: string;
  creationDate?: Date;
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

/**
 * A serialized indirect PDF object: its 1-based id and dictionary/stream body.
 * The body is a string for text objects, or raw bytes when it embeds a binary
 * (e.g. FlateDecode-compressed) stream that must not pass through UTF-8 encoding.
 */
export interface PdfObject {
  id: number;
  body: string | Uint8Array;
}

/** Signature of the object-appending closure used during serialization. */
export type AddPdfObject = (body: string | Uint8Array) => number;
