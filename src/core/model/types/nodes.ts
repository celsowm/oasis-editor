/**
 * Document node graph: runs, paragraphs, tables, rows, cells and the union of
 * block-level nodes used everywhere the editor walks the document tree.
 */
import type {
  EditorBorderStyle,
  EditorDocxWidthValue,
  EditorFieldData,
  EditorFootnoteReferenceData,
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

export interface EditorTextRun {
  id: string;
  text: string;
  styles?: EditorTextStyle;
  image?: EditorImageRunData;
  field?: EditorFieldData;
  revision?: EditorRevision;
  /**
   * Inline marker of a footnote whose body lives in
   * `EditorDocument.footnotes.items[footnoteReference.footnoteId]`.
   */
  footnoteReference?: EditorFootnoteReferenceData;
}

export interface EditorParagraphNode {
  id: string;
  type: "paragraph";
  runs: EditorTextRun[];
  style?: EditorParagraphStyle;
  list?: EditorParagraphListStyle;
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
