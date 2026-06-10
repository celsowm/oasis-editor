/**
 * Document node graph: runs, paragraphs, tables, rows, cells and the union of
 * block-level nodes used everywhere the editor walks the document tree.
 */
import type {
  EditorBorderStyle,
  EditorDocxWidthValue,
  EditorFieldData,
  EditorFootnoteReferenceData,
  EditorImageFloatingLayout,
  EditorImageRunData,
  EditorParagraphListStyle,
  EditorRevision,
  EditorTableLayout,
  EditorTableRowHeightRule,
} from "./primitives.js";
import type {
  EditorParagraphStyle,
  EditorTableStyle,
  EditorTextStyle,
} from "./styles.js";

/**
 * Geometry/appearance of a text box shape (`wps:spPr`). All values are
 * optional; an unset field means "inherit Word's default / leave as-is".
 */
export interface EditorTextBoxShape {
  /** `a:prstGeom/@prst` preset geometry, e.g. "rect". */
  preset?: string;
  /** Solid fill color (`a:solidFill/a:srgbClr`) as `#RRGGBB`. */
  fill?: string;
  /** Outline color (`a:ln/a:solidFill/a:srgbClr`) as `#RRGGBB`. */
  borderColor?: string;
  /** Outline width in points (`a:ln/@w`, originally EMU). */
  borderWidthPt?: number;
}

/**
 * Text body properties of a text box (`wps:bodyPr`): internal padding (insets),
 * vertical anchoring and wrap behaviour.
 */
export interface EditorTextBoxBody {
  /** Internal insets in px (`@lIns/@tIns/@rIns/@bIns`, originally EMU). */
  paddingLeft?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  /** `@anchor`: vertical anchor of the text (t/ctr/b). */
  anchor?: string;
  /** `@wrap`: text wrap mode inside the box (e.g. "square"). */
  wrap?: string;
  /** True when `a:spAutoFit` is present (auto-resize box to text). */
  autoFit?: boolean;
  /** `@vert`: text flow direction inside the box (DrawingML vertical text). */
  vert?: "horz" | "vert" | "vert270" | "wordArtVert" | null;
}

/**
 * A Word text box (`w:drawing` containing a `wps:wsp` WordprocessingShape with
 * `wps:txbx/w:txbxContent`). Modeled as inline run content (analogous to
 * `EditorImageRunData`): the owning run's text is the object replacement
 * character `\uFFFC`. The text box's own content is a list of block nodes.
 */
export interface EditorTextBoxData {
  /** Box width in px (`wp:extent/@cx`, originally EMU). */
  width: number;
  /** Box height in px (`wp:extent/@cy`, originally EMU). */
  height: number;
  /** Block content of `w:txbxContent` (paragraphs and/or tables). */
  blocks: EditorBlockNode[];
  /** Floating/anchor layout when the drawing is a `wp:anchor`. */
  floating?: EditorImageFloatingLayout;
  /** `wp:docPr/@name`. */
  name?: string;
  /** `wp:docPr/@descr` or `@title`. */
  alt?: string;
  shape?: EditorTextBoxShape;
  body?: EditorTextBoxBody;
}

export interface EditorTextRun {
  id: string;
  text: string;
  styles?: EditorTextStyle;
  image?: EditorImageRunData;
  textBox?: EditorTextBoxData;
  field?: EditorFieldData;
  revision?: EditorRevision;
  /**
   * Inline marker of a footnote whose body lives in
   * `EditorDocument.footnotes.items[footnoteReference.footnoteId]`.
   */
  footnoteReference?: EditorFootnoteReferenceData;
}

/**
 * A drop cap (Word's `w:framePr/@dropCap`): a large initial letter sunk into
 * the first lines of the paragraph, with body text wrapping around it. In OOXML
 * the cap lives in a separate preceding frame paragraph; we attach it to the
 * wrapping paragraph so the per-paragraph layout owns its own exclusion + glyph.
 */
export interface EditorDropCap {
  /** Cap letter(s), e.g. "L". */
  text: string;
  /** `w:framePr/@lines` — number of body lines the cap spans (default 3). */
  lines: number;
  /** `w:framePr/@dropCap`: "drop" (in text) or "margin" (in the left margin). */
  type: "drop" | "margin";
  /** Cap run style: fontSize (`w:sz`), font, color, baselineShift (`w:position`). */
  style?: EditorTextStyle;
}

export interface EditorParagraphNode {
  id: string;
  type: "paragraph";
  runs: EditorTextRun[];
  style?: EditorParagraphStyle;
  list?: EditorParagraphListStyle;
  /** Drop cap that body text in this paragraph wraps around, when present. */
  dropCap?: EditorDropCap;
}

export interface EditorTableCellStyle {
  shading?: string;
  width?: number | string;
  borderTop?: EditorBorderStyle;
  borderRight?: EditorBorderStyle;
  borderBottom?: EditorBorderStyle;
  borderLeft?: EditorBorderStyle;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  verticalAlign?: "top" | "middle" | "bottom";
  horizontalAlign?: "left" | "center" | "right" | "justify";
  /** `w:tcPr/w:textDirection/@w:val`: cell text flow direction (vertical text). */
  textDirection?: "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV" | null;
}

export interface EditorTableCellNode {
  id: string;
  blocks: EditorParagraphNode[];
  colSpan?: number;
  rowSpan?: number;
  vMerge?: "restart" | "continue";
  style?: EditorTableCellStyle;
}

export interface EditorTableRowStyle {
  height?: number | string;
  heightRule?: EditorTableRowHeightRule;
  gridBefore?: number;
  gridAfter?: number;
  widthBefore?: EditorDocxWidthValue;
  widthAfter?: EditorDocxWidthValue;
}

export interface EditorTableRowNode {
  id: string;
  cells: EditorTableCellNode[];
  isHeader?: boolean;
  style?: EditorTableRowStyle;
  /**
   * Raw w:tblPrEx XML (per-row table property exceptions), serialized verbatim
   * before w:trPr. Preserved for DOCX round-trip fidelity only; not editable.
   */
  tblPrExXml?: string;
}

export interface EditorTableNode {
  id: string;
  type: "table";
  rows: EditorTableRowNode[];
  gridCols?: number[];
  style?: EditorTableStyle;
}

export type EditorBlockNode = EditorParagraphNode | EditorTableNode;
