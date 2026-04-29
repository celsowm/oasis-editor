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
}

export interface Editor2ParagraphStyle {
  align?: "left" | "center" | "right" | "justify";
  spacingBefore?: number | null;
  spacingAfter?: number | null;
  lineHeight?: number | null;
  indentLeft?: number | null;
  indentRight?: number | null;
  indentFirstLine?: number | null;
}

export interface Editor2TextRun {
  id: string;
  text: string;
  styles?: Editor2TextStyle;
}

export interface Editor2ParagraphNode {
  id: string;
  type: "paragraph";
  runs: Editor2TextRun[];
  style?: Editor2ParagraphStyle;
}

export type Editor2BlockNode = Editor2ParagraphNode;

export interface Editor2Document {
  id: string;
  blocks: Editor2BlockNode[];
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
}

export function getParagraphs(state: Editor2State): Editor2ParagraphNode[] {
  return state.document.blocks;
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
