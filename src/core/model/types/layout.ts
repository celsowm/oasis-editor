/**
 * Layout-model types: structures produced by the layout engine and consumed
 * by the renderer. Strictly downstream of the document model — nothing in
 * `types/document.ts` should ever import from here.
 */
import type { EditorBlockNode, EditorTextBoxData } from "./nodes.js";
import type { EditorPageSettings } from "./document.js";
import type { EditorRevision, EditorImageRunData } from "./primitives.js";
import type { EditorTextStyle } from "./styles.js";

export interface EditorCaretSlot {
  paragraphId: string;
  offset: number;
  left: number;
  top: number;
  height: number;
}

export interface EditorLayoutFragmentChar {
  char: string;
  paragraphOffset: number;
  runOffset: number;
}

export interface EditorLayoutFragment {
  paragraphId: string;
  runId: string;
  startOffset: number;
  endOffset: number;
  text: string;
  styles?: EditorTextStyle;
  image?: EditorImageRunData;
  textBox?: EditorTextBoxData;
  revision?: EditorRevision;
  chars: EditorLayoutFragmentChar[];
}

export interface EditorLayoutLine {
  paragraphId: string;
  index: number;
  startOffset: number;
  endOffset: number;
  top: number;
  height: number;
  slots: EditorCaretSlot[];
  fragments: EditorLayoutFragment[];
  availableWidth?: number;
  /**
   * Set when the line ends mid-word due to automatic hyphenation. Renderers draw
   * a trailing hyphen glyph after the last fragment; it is not part of the text
   * model (no caret slot/offset), so caret and selection logic ignore it.
   */
  trailingHyphen?: boolean;
  /** Advance (px) reserved/drawn for the trailing hyphen; the single source of
   * truth shared by alignment and the canvas/PDF renderers. */
  trailingHyphenWidth?: number;
}

export interface EditorLayoutParagraph {
  paragraphId: string;
  text: string;
  fragments: EditorLayoutFragment[];
  lines: EditorLayoutLine[];
  startOffset?: number;
  endOffset?: number;
  contentWidth?: number;
}

export interface EditorLayoutBlock {
  blockId: string;
  blockType: EditorBlockNode["type"];
  paragraphId?: string;
  globalIndex: number;
  estimatedHeight: number;
  /** Measured visual height for a zero-flow-height floating table. */
  floatingTableHeight?: number;
  /** Runtime collision displacement for `w:tblOverlap="never"`. */
  floatingTableOffsetY?: number;
  layout?: EditorLayoutParagraph;
  tableSegment?: {
    startRowIndex: number;
    endRowIndex: number;
    repeatedHeaderRowCount: number;
    startRowCellBlockStarts?: number[];
    endRowCellBlockEnds?: number[];
    startRowCellBlockPositions?: TableCellBlockPosition[];
    endRowCellBlockPositions?: TableCellBlockPosition[];
  };
  sourceBlockId?: string;
  sourceBlock: EditorBlockNode;
  /**
   * For newspaper multi-column sections: which text column (0-based) this block
   * was flowed into on its physical page. Undefined for single-column pages.
   */
  columnIndex?: number;
}

export interface TableCellBlockPosition {
  blockIndex: number;
  offset?: number;
}

export interface EditorLayoutPage {
  id: string;
  index: number;
  height: number;
  maxHeight: number;
  blocks: EditorLayoutBlock[];
  pageSettings: EditorPageSettings;
  headerBlocks?: EditorLayoutBlock[];
  footerBlocks?: EditorLayoutBlock[];
  footnoteBlocks?: EditorLayoutBlock[];
  footnoteReferenceIds?: string[];
  bodyTop?: number;
  bodyBottom?: number;
  headerTop?: number;
  footerTop?: number;
  footnoteTop?: number;
  footnoteSeparatorTop?: number;
}

export interface EditorLayoutDocument {
  pages: EditorLayoutPage[];
}
