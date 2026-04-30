export interface Editor2TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  fontFamily?: string | null;
  fontSize?: number | null;
  color?: string | null;
  highlight?: string | null;
  link?: string | null;
}

export interface Editor2ParagraphStyle {
  align?: "left" | "center" | "right" | "justify";
  spacingBefore?: number | null;
  spacingAfter?: number | null;
  lineHeight?: number | null;
  indentLeft?: number | null;
  indentRight?: number | null;
  indentFirstLine?: number | null;
  pageBreakBefore?: boolean;
  keepWithNext?: boolean;
}

export interface Editor2ParagraphListStyle {
  kind: "bullet" | "ordered";
  level?: number;
}

export interface Editor2ImageRunData {
  src: string;
  width: number;
  height: number;
  alt?: string;
}

export interface Editor2TextRun {
  id: string;
  text: string;
  styles?: Editor2TextStyle;
  image?: Editor2ImageRunData;
}

export interface Editor2ParagraphNode {
  id: string;
  type: "paragraph";
  runs: Editor2TextRun[];
  style?: Editor2ParagraphStyle;
  list?: Editor2ParagraphListStyle;
}

export interface Editor2TableCellNode {
  id: string;
  blocks: Editor2ParagraphNode[];
  colSpan?: number;
  rowSpan?: number;
  vMerge?: "restart" | "continue";
}

export interface Editor2TableRowNode {
  id: string;
  cells: Editor2TableCellNode[];
  isHeader?: boolean;
}

export interface Editor2TableNode {
  id: string;
  type: "table";
  rows: Editor2TableRowNode[];
}

export type Editor2BlockNode = Editor2ParagraphNode | Editor2TableNode;

export interface Editor2PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
  header: number;
  footer: number;
  gutter: number;
}

export interface Editor2PageSettings {
  width: number;
  height: number;
  margins: Editor2PageMargins;
}

export interface Editor2Document {
  id: string;
  blocks: Editor2BlockNode[];
  pageSettings?: Editor2PageSettings;
}

export interface Editor2Position {
  paragraphId: string;
  runId: string;
  offset: number;
}

export interface Editor2Selection {
  anchor: Editor2Position;
  focus: Editor2Position;
}

export interface Editor2State {
  document: Editor2Document;
  selection: Editor2Selection;
}

export interface Editor2CaretSlot {
  paragraphId: string;
  offset: number;
  left: number;
  top: number;
  height: number;
}

export interface Editor2LayoutFragmentChar {
  char: string;
  paragraphOffset: number;
  runOffset: number;
}

export interface Editor2LayoutFragment {
  paragraphId: string;
  runId: string;
  startOffset: number;
  endOffset: number;
  text: string;
  styles?: Editor2TextStyle;
  image?: Editor2ImageRunData;
  chars: Editor2LayoutFragmentChar[];
}

export interface Editor2LayoutLine {
  paragraphId: string;
  index: number;
  startOffset: number;
  endOffset: number;
  top: number;
  height: number;
  slots: Editor2CaretSlot[];
  fragments: Editor2LayoutFragment[];
}

export interface Editor2LayoutParagraph {
  paragraphId: string;
  text: string;
  fragments: Editor2LayoutFragment[];
  lines: Editor2LayoutLine[];
  startOffset?: number;
  endOffset?: number;
}

export interface Editor2LayoutBlock {
  blockId: string;
  blockType: Editor2BlockNode["type"];
  paragraphId?: string;
  globalIndex: number;
  estimatedHeight: number;
  layout?: Editor2LayoutParagraph;
  tableSegment?: {
    startRowIndex: number;
    endRowIndex: number;
    repeatedHeaderRowCount: number;
  };
  sourceBlockId?: string;
  sourceBlock: Editor2BlockNode;
}

export interface Editor2LayoutPage {
  id: string;
  index: number;
  height: number;
  maxHeight: number;
  blocks: Editor2LayoutBlock[];
}

export interface Editor2LayoutDocument {
  maxPageHeight: number;
  pages: Editor2LayoutPage[];
}

export const DEFAULT_EDITOR2_PAGE_SETTINGS: Editor2PageSettings = {
  width: 816,
  height: 1056,
  margins: {
    top: 96,
    right: 96,
    bottom: 96,
    left: 96,
    header: 48,
    footer: 48,
    gutter: 0,
  },
};

export function getDocumentPageSettings(document: Editor2Document): Editor2PageSettings {
  const pageSettings = document.pageSettings;
  return {
    width: pageSettings?.width ?? DEFAULT_EDITOR2_PAGE_SETTINGS.width,
    height: pageSettings?.height ?? DEFAULT_EDITOR2_PAGE_SETTINGS.height,
    margins: {
      top: pageSettings?.margins.top ?? DEFAULT_EDITOR2_PAGE_SETTINGS.margins.top,
      right: pageSettings?.margins.right ?? DEFAULT_EDITOR2_PAGE_SETTINGS.margins.right,
      bottom: pageSettings?.margins.bottom ?? DEFAULT_EDITOR2_PAGE_SETTINGS.margins.bottom,
      left: pageSettings?.margins.left ?? DEFAULT_EDITOR2_PAGE_SETTINGS.margins.left,
      header: pageSettings?.margins.header ?? DEFAULT_EDITOR2_PAGE_SETTINGS.margins.header,
      footer: pageSettings?.margins.footer ?? DEFAULT_EDITOR2_PAGE_SETTINGS.margins.footer,
      gutter: pageSettings?.margins.gutter ?? DEFAULT_EDITOR2_PAGE_SETTINGS.margins.gutter,
    },
  };
}

export function getPageContentWidth(pageSettings: Editor2PageSettings): number {
  return Math.max(
    24,
    Math.floor(pageSettings.width - pageSettings.margins.left - pageSettings.margins.right - pageSettings.margins.gutter),
  );
}

export function getPageContentHeight(pageSettings: Editor2PageSettings): number {
  return Math.max(
    24,
    Math.floor(pageSettings.height - pageSettings.margins.top - pageSettings.margins.bottom),
  );
}

export function getBlockParagraphs(block: Editor2BlockNode): Editor2ParagraphNode[] {
  if (block.type === "paragraph") {
    return [block];
  }

  return block.rows.flatMap((row) => row.cells.flatMap((cell) => cell.blocks));
}

export function getDocumentParagraphs(document: Editor2Document): Editor2ParagraphNode[] {
  return document.blocks.flatMap((block) => getBlockParagraphs(block));
}

export function getParagraphs(state: Editor2State): Editor2ParagraphNode[] {
  return getDocumentParagraphs(state.document);
}

export function getParagraphText(paragraph: Editor2ParagraphNode): string {
  return paragraph.runs.map((run) => run.text).join("");
}

export function getParagraphLength(paragraph: Editor2ParagraphNode): number {
  return getParagraphText(paragraph).length;
}

export function getRunIndex(paragraph: Editor2ParagraphNode, runId: string): number {
  const index = paragraph.runs.findIndex((run) => run.id === runId);
  return index === -1 ? 0 : index;
}

export function getRunStartOffset(paragraph: Editor2ParagraphNode, runId: string): number {
  let offset = 0;
  for (const run of paragraph.runs) {
    if (run.id === runId) {
      return offset;
    }
    offset += run.text.length;
  }
  return 0;
}

export function paragraphOffsetToPosition(
  paragraph: Editor2ParagraphNode,
  paragraphOffset: number,
): Editor2Position {
  const maxOffset = Math.max(0, Math.min(paragraphOffset, getParagraphLength(paragraph)));
  let consumed = 0;

  for (const run of paragraph.runs) {
    const nextConsumed = consumed + run.text.length;
    if (maxOffset <= nextConsumed) {
      return {
        paragraphId: paragraph.id,
        runId: run.id,
        offset: maxOffset - consumed,
      };
    }
    consumed = nextConsumed;
  }

  const fallbackRun = paragraph.runs[paragraph.runs.length - 1];
  return {
    paragraphId: paragraph.id,
    runId: fallbackRun.id,
    offset: fallbackRun.text.length,
  };
}

export function positionToParagraphOffset(
  paragraph: Editor2ParagraphNode,
  position: Editor2Position,
): number {
  const runIndex = getRunIndex(paragraph, position.runId);
  let offset = 0;

  for (let index = 0; index < runIndex; index += 1) {
    offset += paragraph.runs[index]?.text.length ?? 0;
  }

  const activeRun = paragraph.runs[runIndex];
  return offset + Math.max(0, Math.min(position.offset, activeRun?.text.length ?? 0));
}
