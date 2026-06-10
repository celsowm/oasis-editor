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
  EditorTabStop,
  EditorTextLanguage,
  EditorUnderlineStyle,
} from "./primitives.js";

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
  lineHeight?: number | null;
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
}

export interface EditorTableStyle {
  styleId?: string;
  width?: EditorDocxWidthValue;
  align?: "left" | "center" | "right";
  indentLeft?: EditorDocxWidthValue;
  layout?: "fixed" | "autofit";
  cellSpacing?: EditorDocxWidthValue;
  pageBreakBefore?: boolean;
}

export interface EditorNamedStyle {
  id: string;
  name: string;
  type: "paragraph" | "character" | "table";
  basedOn?: string;
  nextStyle?: string;
  paragraphStyle?: EditorParagraphStyle;
  textStyle?: EditorTextStyle;
  tableStyle?: EditorTableStyle;
}
