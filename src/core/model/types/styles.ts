/**
 * Style-related types: per-run text formatting, per-paragraph layout, and the
 * named-style registry used for cascading inheritance.
 */
import type {
  EditorBorderStyle,
  EditorDocxWidthValue,
  EditorLigatures,
  EditorNumberForm,
  EditorNumberSpacing,
  EditorPropertyRevision,
  EditorTabStop,
  EditorTextLanguage,
  EditorUnderlineStyle,
} from "./primitives.js";
import type { EditorTableCellStyle } from "./nodes.js";

export interface EditorTextStyle {
  styleId?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  underlineStyle?: EditorUnderlineStyle | null;
  underlineColor?: string | null;
  strike?: boolean;
  doubleStrike?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  smallCaps?: boolean;
  allCaps?: boolean;
  hidden?: boolean;
  noProof?: boolean;
  webHidden?: boolean;
  specVanish?: boolean;
  textEffect?: string | null;
  characterScale?: number | null;
  characterSpacing?: number | null;
  baselineShift?: number | null;
  kerningThreshold?: number | null;
  ligatures?: EditorLigatures | null;
  numberSpacing?: EditorNumberSpacing | null;
  numberForm?: EditorNumberForm | null;
  stylisticSet?: number | null;
  contextualAlternates?: boolean;
  fontFamily?: string | null;
  fontSize?: number | null;
  color?: string | null;
  highlight?: string | null;
  shading?: string | null;
  language?: EditorTextLanguage | null;
  link?: string | null;
}

export interface EditorParagraphStyle {
  styleId?: string;
  align?: "left" | "center" | "right" | "justify";
  spacingBefore?: number | null;
  spacingAfter?: number | null;
  contextualSpacing?: boolean;
  /**
   * Line spacing value. Interpretation depends on `lineRule`:
   * - `auto`/absent: multiplier of single line spacing (e.g. 1.15).
   * - `exact`/`atLeast`: absolute height in px.
   */
  lineHeight?: number | null;
  /** `w:spacing/@w:lineRule`. Defaults to `auto` (multiplier) when absent. */
  lineRule?: "auto" | "exact" | "atLeast" | null;
  lineGridPitch?: number | null;
  lineGridType?: "lines" | "linesAndChars" | "snapToChars" | null;
  snapToGrid?: boolean;
  indentLeft?: number | null;
  indentRight?: number | null;
  indentFirstLine?: number | null;
  indentHanging?: number | null;
  shading?: string | null;
  borderTop?: EditorBorderStyle | null;
  borderRight?: EditorBorderStyle | null;
  borderBottom?: EditorBorderStyle | null;
  borderLeft?: EditorBorderStyle | null;
  tabs?: EditorTabStop[] | null;
  pageBreakBefore?: boolean;
  keepWithNext?: boolean;
  keepLinesTogether?: boolean;
  widowControl?: boolean;
  /** `w:textDirection/@w:val`: paragraph flow direction (vertical text). */
  textDirection?: "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV" | null;
  /** `w:outlineLvl/@w:val`: outline level 0–8 (0 = Heading 1 … 8 = Heading 9). */
  outlineLevel?: number | null;
}

/** Row properties from a conditional format's `w:trPr`. */
export interface EditorConditionalRowStyle {
  isHeader?: boolean;
  height?: number | string;
  heightRule?: "auto" | "exact" | "atLeast";
  cantSplit?: boolean;
  hidden?: boolean;
}

export interface EditorTableConditionalFormat {
  shading?: string;
  /** Run formatting (bold/color) from the conditional's `w:rPr`. */
  textStyle?: EditorTextStyle;
  /** Cell borders from the conditional's `w:tcPr/w:tcBorders`. */
  borders?: {
    borderTop?: EditorBorderStyle;
    borderRight?: EditorBorderStyle;
    borderBottom?: EditorBorderStyle;
    borderLeft?: EditorBorderStyle;
  };
  /** Paragraph properties from the conditional's `w:pPr`. */
  paragraphStyle?: EditorParagraphStyle;
  /** Row properties from the conditional's `w:trPr`. */
  rowStyle?: EditorConditionalRowStyle;
  /** Full cell properties from conditional `w:tcPr`. */
  cellStyle?: EditorTableCellStyle;
  /** Conditional table properties from `w:tblPr`. */
  tableStyle?: EditorTableStyle;
}

export type EditorTableConditionalType =
  | "wholeTable"
  | "band1Horz"
  | "band2Horz"
  | "band1Vert"
  | "band2Vert"
  | "firstCol"
  | "lastCol"
  | "firstRow"
  | "lastRow"
  | "nwCell"
  | "neCell"
  | "swCell"
  | "seCell";

export type EditorTableConditionalFlags = Partial<
  Record<EditorTableConditionalType, boolean>
>;

/** Typed `w:tblpPr` positioning for a table whose text wrapping is "around". */
export interface EditorTableFloatingLayout {
  /** Horizontal positioning reference (`w:horzAnchor`). */
  horizontalAnchor?: "margin" | "page" | "text";
  /** Vertical positioning reference (`w:vertAnchor`). */
  verticalAnchor?: "margin" | "page" | "text";
  /** Explicit horizontal offset in points (`w:tblpX`, originally twips). */
  x?: number;
  /** Explicit vertical offset in points (`w:tblpY`, originally twips). */
  y?: number;
  /** Aligned horizontal position (`w:tblpXSpec`). */
  xAlign?: "left" | "center" | "right" | "inside" | "outside";
  /** Aligned vertical position (`w:tblpYSpec`). */
  yAlign?: "top" | "center" | "bottom" | "inside" | "outside";
  /** Text-wrap distances in points. */
  distanceTop?: number;
  distanceRight?: number;
  distanceBottom?: number;
  distanceLeft?: number;
}

export interface EditorTableStyle {
  styleId?: string;
  width?: EditorDocxWidthValue;
  align?: "left" | "center" | "right";
  indentLeft?: EditorDocxWidthValue;
  layout?: "fixed" | "autofit";
  cellSpacing?: EditorDocxWidthValue;
  borders?: {
    borderTop?: EditorBorderStyle;
    borderRight?: EditorBorderStyle;
    borderBottom?: EditorBorderStyle;
    borderLeft?: EditorBorderStyle;
    borderInsideH?: EditorBorderStyle;
    borderInsideV?: EditorBorderStyle;
  };
  pageBreakBefore?: boolean;
  /** `w:bidiVisual`: visually order table columns right-to-left. */
  bidiVisual?: boolean;
  /** `w:tblOverlap/@w:val`: floating-table overlap behavior. */
  tblOverlap?: "overlap" | "never";
  /** `w:tblCellMar`: default margins for cells unless overridden by `w:tcMar`. */
  defaultCellMargins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    start?: number;
    end?: number;
  };
  /** Typed `w:tblpPr` floating-table position and wrap distances. */
  floating?: EditorTableFloatingLayout;
  /** Table alt text title, corresponding to Word's table properties Alt Text title. */
  altTitle?: string;
  /** Table alt text description, corresponding to Word's table properties Alt Text description. */
  altDescription?: string;
  /** Previous table properties from `w:tblPrChange`. */
  revision?: EditorPropertyRevision<EditorTableStyle>;
  /** `w:tblStyleRowBandSize` — rows per horizontal band (default 1). */
  rowBandSize?: number;
  /** `w:tblStyleColBandSize` — columns per vertical band (default 1). */
  colBandSize?: number;
  /** Keyed by conditional type ("firstRow", "lastRow", "band1Horz", etc.). */
  conditionalFormats?: Record<string, EditorTableConditionalFormat>;
  /** `w:tblLook` flags from the instance table; preserved for re-export. */
  tblLook?: {
    firstRow: boolean;
    lastRow: boolean;
    firstCol: boolean;
    lastCol: boolean;
    noHBand: boolean;
    noVBand: boolean;
  };
}

export interface EditorNamedStyle {
  id: string;
  name: string;
  type: "paragraph" | "character" | "table";
  isDefault?: boolean;
  basedOn?: string;
  nextStyle?: string;
  /** Word quick-style gallery metadata (`w:qFormat`). */
  qFormat?: boolean;
  /** Lower values appear earlier in Word's quick-style gallery. */
  uiPriority?: number;
  /** Hide the style from style-selection user interfaces. */
  semiHidden?: boolean;
  /** Reveal a semi-hidden style after it is used by document content. */
  unhideWhenUsed?: boolean;
  paragraphStyle?: EditorParagraphStyle;
  textStyle?: EditorTextStyle;
  tableStyle?: EditorTableStyle;
}
