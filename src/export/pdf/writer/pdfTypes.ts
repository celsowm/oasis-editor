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
