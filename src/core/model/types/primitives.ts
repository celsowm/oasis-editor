/**
 * Primitive building blocks shared across the editor model: borders, tabs,
 * image run data, footnote references, revisions, fields, list styles.
 * Kept dependency-free so it can be imported by every other model module
 * without risk of circular imports.
 */

export type EditorUnderlineStyle =
  | "single"
  | "double"
  | "thick"
  | "dotted"
  | "dottedHeavy"
  | "dash"
  | "dashedHeavy"
  | "dashLong"
  | "dashLongHeavy"
  | "dotDash"
  | "dashDotHeavy"
  | "dotDotDash"
  | "dashDotDotHeavy"
  | "wave"
  | "wavyHeavy"
  | "wavyDouble"
  | "words";

export type EditorLigatures =
  | "none"
  | "standard"
  | "contextual"
  | "historical"
  | "standardContextual";

export type EditorNumberSpacing = "default" | "proportional" | "tabular";
export type EditorNumberForm = "default" | "lining" | "oldStyle";

export interface EditorTextLanguage {
  value?: string | null;
  eastAsia?: string | null;
  bidi?: string | null;
}

export interface EditorBorderStyle {
  width: number; // in pt
  type: "solid" | "dashed" | "dotted" | "none";
  color: string;
}

export interface EditorTabStop {
  position: number; // in pt
  type: "left" | "center" | "right" | "decimal" | "bar" | "clear";
  leader?: "none" | "dot" | "hyphen" | "underscore" | "heavy" | "middleDot";
}

export interface EditorParagraphListStyle {
  kind: "bullet" | "ordered";
  level?: number;
  format?:
    | "decimal"
    | "lowerLetter"
    | "upperLetter"
    | "lowerRoman"
    | "upperRoman"
    | "bullet";
  startAt?: number;
  /**
   * Separator between the list label and the paragraph text (`w:lvl/w:suff`).
   * OOXML default is "tab"; Word renders the label, then advances to the next
   * tab stop (or a space / nothing). Undefined is treated as "tab".
   */
  suffix?: "tab" | "space" | "nothing";
}

/**
 * Image crop, mapped from DrawingML `a:srcRect`. Values are fractions of the
 * source image (0..1), where OOXML's thousandths-of-a-percent (`100000` = 100%)
 * have already been normalized. Each side is the amount trimmed from that edge.
 */
export interface EditorImageCrop {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
}

export type EditorImageFillMode = "stretch" | "tile";

export interface EditorImageFloatingPosition {
  relativeFrom?: string;
  align?: string;
  offset?: number;
}

export interface EditorImageFloatingLayout {
  type: "floating";
  distT?: number;
  distB?: number;
  distL?: number;
  distR?: number;
  simplePos?: boolean;
  relativeHeight?: number;
  behindDoc?: boolean;
  locked?: boolean;
  layoutInCell?: boolean;
  allowOverlap?: boolean;
  positionH?: EditorImageFloatingPosition;
  positionV?: EditorImageFloatingPosition;
  wrap?: "none" | "square" | "tight" | "through" | "topAndBottom";
}

/** A point on the tight/through wrap contour, fractional (0..1) relative to the
 * image bounding box with origin at the top-left corner. */
export interface EditorWrapPolygonPoint {
  x: number;
  y: number;
}

export interface EditorImageRunData {
  src: string;
  width: number;
  height: number;
  alt?: string;
  linkedSrc?: string;
  crop?: EditorImageCrop;
  fillMode?: EditorImageFillMode;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
  floating?: EditorImageFloatingLayout;
  /** Tight/through wrap outline (fractional 0..1). Auto-traced from the image
   * alpha or round-tripped from OOXML <wp:wrapPolygon>. Absent ⇒ rectangular. */
  wrapPolygon?: EditorWrapPolygonPoint[];
}

export interface EditorFieldData {
  type: "PAGE" | "NUMPAGES";
}

export interface EditorFootnoteReferenceData {
  footnoteId: string;
  customMark?: string;
}

export interface EditorEndnoteReferenceData {
  endnoteId: string;
  customMark?: string;
}

export interface EditorRevision {
  id: string;
  type: "insert" | "delete";
  author: string;
  date: number;
}

export interface EditorAsset {
  id: string;
  url: string;
}

export const EDITOR_ASSET_REF_PREFIX = "asset:";

export type EditorFootnoteNumberFormat =
  | "decimal"
  | "lowerRoman"
  | "upperRoman"
  | "lowerLetter"
  | "upperLetter"
  | "symbol";

export type EditorFootnoteRestart = "continuous" | "eachSection";

/**
 * A DOCX width-like value.
 * - number: points, serialized as w:type="dxa"
 * - "NN%": percentage, serialized as w:type="pct"
 * - "auto": serialized as w:type="auto" w:w="0"
 */
export type EditorDocxWidthValue = number | string;

export type EditorTableLayout = "fixed" | "autofit";
export type EditorTableRowHeightRule = "auto" | "exact" | "atLeast";
