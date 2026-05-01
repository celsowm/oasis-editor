import type {
  Editor2BlockNode,
  Editor2Document,
  Editor2PageSettings,
  Editor2ParagraphNode,
  Editor2Position,
  Editor2State,
  Editor2TableCellNode,
  Editor2TableNode,
  Editor2TableRowNode,
  Editor2TextRun,
  Editor2TextStyle,
  Editor2ImageRunData,
  Editor2EditingZone,
} from "./model.js";
import {
  DEFAULT_EDITOR2_PAGE_SETTINGS,
  getDocumentParagraphs,
  getDocumentSections,
  getParagraphLength,
  normalizePageSettings,
  paragraphOffsetToPosition,
  type Editor2Section,
} from "./model.js";
import { createCollapsedSelection } from "./selection.js";

let nextDocumentId = 1;
let nextParagraphId = 1;
let nextRunId = 1;

export function createEditor2Document(
  blocks: Editor2BlockNode[],
  pageSettings?: Editor2PageSettings,
): Editor2Document {
  const normalizedPageSettings = normalizePageSettings(
    pageSettings
      ? {
          width: pageSettings.width,
          height: pageSettings.height,
          orientation: pageSettings.orientation,
          margins: { ...pageSettings.margins },
        }
      : {
          width: DEFAULT_EDITOR2_PAGE_SETTINGS.width,
          height: DEFAULT_EDITOR2_PAGE_SETTINGS.height,
          orientation: DEFAULT_EDITOR2_PAGE_SETTINGS.orientation,
          margins: { ...DEFAULT_EDITOR2_PAGE_SETTINGS.margins },
        },
  );
  const document: Editor2Document = {
    id: `document:${nextDocumentId}`,
    sections: [
      {
        id: "section:1",
        blocks,
        pageSettings: normalizedPageSettings,
      },
    ],
    // Keep blocks for legacy compatibility during transition if needed, 
    // but we should ideally move to sections-only.
    blocks, 
    pageSettings: normalizedPageSettings,
  };
  nextDocumentId += 1;
  return document;
}

export function createEditor2Paragraph(text: string): Editor2ParagraphNode {
  const run = createEditor2StyledRun(text);
  const paragraph: Editor2ParagraphNode = {
    id: `paragraph:${nextParagraphId}`,
    type: "paragraph",
    runs: [run],
  };
  nextParagraphId += 1;
  return paragraph;
}

export function createEditor2ParagraphFromRuns(
  runs: Array<{ text: string; styles?: Editor2TextStyle; image?: Editor2ImageRunData }>,
): Editor2ParagraphNode {
  const paragraph: Editor2ParagraphNode = {
    id: `paragraph:${nextParagraphId}`,
    type: "paragraph",
    runs: runs.map((run) => createEditor2StyledRun(run.text, run.styles, run.image)),
  };
  nextParagraphId += 1;
  return paragraph;
}

export function createEditor2StyledRun(
  text: string,
  styles?: Editor2TextStyle,
  image?: Editor2ImageRunData,
): Editor2TextRun {
  const run: Editor2TextRun = {
    id: `run:${nextRunId}`,
    text,
    styles: styles ? { ...styles } : undefined,
    image: image ? { ...image } : undefined,
  };
  nextRunId += 1;
  return run;
}

export function createEditor2Table(rows: Editor2TableRowNode[]): Editor2TableNode {
  const table: Editor2TableNode = {
    id: `table:${nextParagraphId}`,
    type: "table",
    rows,
  };
  nextParagraphId += 1;
  return table;
}

export function resetEditor2Ids(): void {
  nextDocumentId = 1;
  nextParagraphId = 1;
  nextRunId = 1;
}

export function createEditor2TableRow(
  cells: Editor2TableCellNode[],
  options?: { isHeader?: boolean },
): Editor2TableRowNode {
  const row: Editor2TableRowNode = {
    id: `row:${nextParagraphId}`,
    cells,
    isHeader: options?.isHeader,
  };
  nextParagraphId += 1;
  return row;
}

export function createEditor2TableCell(
  blocks: Editor2ParagraphNode[],
  colSpan?: number,
  vMerge?: { rowSpan?: number; vMerge: "restart" | "continue" } | "continue",
): Editor2TableCellNode {
  const cell: Editor2TableCellNode = {
    id: `cell:${nextParagraphId}`,
    blocks,
    colSpan,
    rowSpan: typeof vMerge === "object" ? vMerge.rowSpan : undefined,
    vMerge: typeof vMerge === "object" ? vMerge.vMerge : vMerge,
  };
  nextParagraphId += 1;
  return cell;
}

export function createEditor2StateFromDocument(
  document: Editor2Document,
  selection?: { paragraphIndex?: number; offset?: number },
): Editor2State {
  const sections = getDocumentSections(document);
  const activeSectionIndex = 0;
  const activeZone: Editor2EditingZone = "main";
  
  const section = sections[activeSectionIndex]!;
  const blocks = section.blocks.length > 0 ? section.blocks : [createEditor2Paragraph("")];
  
  const paragraphs = getDocumentParagraphs({
    ...document,
    sections: sections.map((s, i) => i === activeSectionIndex ? { ...s, blocks } : s),
  });
  
  const paragraphIndex = Math.max(
    0,
    Math.min(selection?.paragraphIndex ?? 0, paragraphs.length - 1),
  );
  const paragraph = paragraphs[paragraphIndex]!;
  const position: Editor2Position = paragraphOffsetToPosition(
    paragraph,
    Math.max(0, Math.min(selection?.offset ?? 0, getParagraphLength(paragraph))),
  );

  return {
    document: {
      ...document,
      sections: sections.map((s, i) => i === activeSectionIndex ? { ...s, blocks } : s),
      blocks, // Sync legacy blocks
    },
    selection: createCollapsedSelection(position),
    activeSectionIndex,
    activeZone,
  };
}

export function createInitialEditor2State(): Editor2State {
  const paragraph = createEditor2Paragraph("");
  const run = paragraph.runs[0];
  return {
    document: createEditor2Document([paragraph]),
    selection: createCollapsedSelection({
      paragraphId: paragraph.id,
      runId: run.id,
      offset: 0,
    }),
    activeSectionIndex: 0,
    activeZone: "main",
  };
}

export function createEditor2StateFromTexts(
  texts: string[],
  selection?: {
    anchor?: { blockIndex: number; offset: number };
    focus?: { blockIndex: number; offset: number };
    blockIndex?: number;
    offset?: number;
  },
): Editor2State {
  const paragraphs =
    texts.length > 0 ? texts.map((text) => createEditor2Paragraph(text)) : [createEditor2Paragraph("")];
  const defaultIndex = selection?.blockIndex ?? selection?.anchor?.blockIndex ?? 0;
  const anchorIndex = Math.max(
    0,
    Math.min(selection?.anchor?.blockIndex ?? defaultIndex, paragraphs.length - 1),
  );
  const focusIndex = Math.max(
    0,
    Math.min(selection?.focus?.blockIndex ?? selection?.blockIndex ?? anchorIndex, paragraphs.length - 1),
  );
  const anchorParagraph = paragraphs[anchorIndex];
  const focusParagraph = paragraphs[focusIndex];
  const anchorRun = anchorParagraph.runs[0];
  const focusRun = focusParagraph.runs[0];
  const anchorOffset = selection?.anchor?.offset ?? selection?.offset ?? 0;
  const focusOffset = selection?.focus?.offset ?? selection?.offset ?? anchorOffset;

  return {
    document: createEditor2Document(paragraphs),
    selection: {
      anchor: {
        paragraphId: anchorParagraph.id,
        runId: anchorRun.id,
        offset: Math.max(0, Math.min(anchorOffset, anchorRun.text.length)),
      },
      focus: {
        paragraphId: focusParagraph.id,
        runId: focusRun.id,
        offset: Math.max(0, Math.min(focusOffset, focusRun.text.length)),
      },
    },
    activeSectionIndex: 0,
    activeZone: "main",
  };
}

export function createEditor2StateFromParagraphRuns(
  paragraphsSpec: Array<Array<{ text: string; styles?: Editor2TextStyle; image?: Editor2ImageRunData }>>,
  selection?: {
    anchor?: { blockIndex: number; offset: number };
    focus?: { blockIndex: number; offset: number };
    blockIndex?: number;
    offset?: number;
  },
): Editor2State {
  const paragraphs =
    paragraphsSpec.length > 0
      ? paragraphsSpec.map((runs) => createEditor2ParagraphFromRuns(runs))
      : [createEditor2Paragraph("")];

  const defaultIndex = selection?.blockIndex ?? selection?.anchor?.blockIndex ?? 0;
  const anchorIndex = Math.max(
    0,
    Math.min(selection?.anchor?.blockIndex ?? defaultIndex, paragraphs.length - 1),
  );
  const focusIndex = Math.max(
    0,
    Math.min(selection?.focus?.blockIndex ?? selection?.blockIndex ?? anchorIndex, paragraphs.length - 1),
  );
  const anchorParagraph = paragraphs[anchorIndex];
  const focusParagraph = paragraphs[focusIndex];
  const anchorOffset = selection?.anchor?.offset ?? selection?.offset ?? 0;
  const focusOffset = selection?.focus?.offset ?? selection?.offset ?? anchorOffset;
  const anchorPosition = paragraphOffsetToPosition(
    anchorParagraph,
    Math.max(0, Math.min(anchorOffset, anchorParagraph.runs.reduce((sum, run) => sum + run.text.length, 0))),
  );
  const focusPosition = paragraphOffsetToPosition(
    focusParagraph,
    Math.max(0, Math.min(focusOffset, focusParagraph.runs.reduce((sum, run) => sum + run.text.length, 0))),
  );

  return {
    document: createEditor2Document(paragraphs),
    selection: {
      anchor: anchorPosition,
      focus: focusPosition,
    },
    activeSectionIndex: 0,
    activeZone: "main",
  };
}

export function cloneEditor2State(source: Editor2State): Editor2State {
  return {
    document: { ...source.document },
    selection: {
      anchor: { ...source.selection.anchor },
      focus: { ...source.selection.focus },
    },
    activeSectionIndex: source.activeSectionIndex,
    activeZone: source.activeZone,
  };
}
