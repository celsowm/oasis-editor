import type {
  Editor2BlockNode,
  Editor2Document,
  Editor2EditingZone,
  Editor2PageSettings,
  Editor2ParagraphNode,
  Editor2Position,
  Editor2Section,
  Editor2State,
  Editor2TableCellNode,
  Editor2TableNode,
  Editor2TableRowNode,
  Editor2TextRun,
  Editor2TextStyle,
  Editor2ImageRunData,
  Editor2NamedStyle,
} from "./model.js";
import {
  DEFAULT_EDITOR2_PAGE_SETTINGS,
  getDocumentParagraphs,
  getParagraphLength,
  normalizePageSettings,
  paragraphOffsetToPosition,
} from "./model.js";
import { createCollapsedSelection } from "./selection.js";

let nextDocumentId = 1;
let nextParagraphId = 1;
let nextRunId = 1;
let nextTableId = 1;
let nextTableRowId = 1;
let nextTableCellId = 1;

export function resetEditor2Ids(): void {
  nextDocumentId = 1;
  nextParagraphId = 1;
  nextRunId = 1;
  nextTableId = 1;
  nextTableRowId = 1;
  nextTableCellId = 1;
}

export function createEditor2Run(text = ""): Editor2TextRun {
  const run: Editor2TextRun = {
    id: `run:${nextRunId}`,
    text,
  };
  nextRunId += 1;
  return run;
}

export function createEditor2StyledRun(text = "", styles?: Editor2TextStyle, image?: Editor2ImageRunData): Editor2TextRun {
  const run = createEditor2Run(text);
  if (styles) {
    run.styles = { ...styles };
  }
  if (image) {
    run.image = { ...image };
  }
  return run;
}

export function createEditor2Paragraph(text = ""): Editor2ParagraphNode {
  const paragraph: Editor2ParagraphNode = {
    id: `paragraph:${nextParagraphId}`,
    type: "paragraph",
    runs: [createEditor2Run(text)],
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
    runs: runs.length > 0 ? runs.map((run) => createEditor2StyledRun(run.text, run.styles, run.image)) : [createEditor2Run("")],
  };
  nextParagraphId += 1;
  return paragraph;
}

export function createEditor2TableCell(
  paragraphs: Editor2ParagraphNode[],
  colSpan = 1,
  options?: {
    rowSpan?: number;
    vMerge?: "restart" | "continue";
  },
): Editor2TableCellNode {
  const cell: Editor2TableCellNode = {
    id: `table-cell:${nextTableCellId}`,
    blocks: paragraphs.length > 0 ? paragraphs : [createEditor2Paragraph("")],
  };
  if (colSpan > 1) {
    cell.colSpan = colSpan;
  }
  if (options?.rowSpan && options.rowSpan > 1) {
    cell.rowSpan = options.rowSpan;
  }
  if (options?.vMerge) {
    cell.vMerge = options.vMerge;
  }
  nextTableCellId += 1;
  return cell;
}

export function createEditor2TableRow(
  cells: Editor2TableCellNode[],
  options?: { isHeader?: boolean },
): Editor2TableRowNode {
  const row: Editor2TableRowNode = {
    id: `table-row:${nextTableRowId}`,
    cells,
  };
  if (options?.isHeader) {
    row.isHeader = true;
  }
  nextTableRowId += 1;
  return row;
}

export function createEditor2Table(rows: Editor2TableRowNode[]): Editor2TableNode {
  const table: Editor2TableNode = {
    id: `table:${nextTableId}`,
    type: "table",
    rows,
  };
  nextTableId += 1;
  return table;
}

export const DEFAULT_EDITOR2_STYLES: Record<string, Editor2NamedStyle> = {
  normal: {
    id: "normal",
    name: "Normal",
    type: "paragraph",
    paragraphStyle: {
      spacingAfter: 8,
      lineHeight: 1.15,
    },
    textStyle: {
      fontFamily: "Calibri, sans-serif",
      fontSize: 15,
    },
  },
  heading1: {
    id: "heading1",
    name: "Heading 1",
    type: "paragraph",
    basedOn: "normal",
    nextStyle: "normal",
    paragraphStyle: {
      spacingBefore: 24,
      spacingAfter: 0,
    },
    textStyle: {
      fontFamily: "Calibri Light, sans-serif",
      fontSize: 27,
      color: "#2e74b5",
    },
  },
  heading2: {
    id: "heading2",
    name: "Heading 2",
    type: "paragraph",
    basedOn: "normal",
    nextStyle: "normal",
    paragraphStyle: {
      spacingBefore: 13,
      spacingAfter: 0,
    },
    textStyle: {
      fontFamily: "Calibri Light, sans-serif",
      fontSize: 17,
      color: "#2e74b5",
    },
  },
  heading3: {
    id: "heading3",
    name: "Heading 3",
    type: "paragraph",
    basedOn: "normal",
    nextStyle: "normal",
    paragraphStyle: {
      spacingBefore: 13,
      spacingAfter: 0,
    },
    textStyle: {
      fontFamily: "Calibri Light, sans-serif",
      fontSize: 16,
      color: "#1f4d78",
    },
  },
};

export function createEditor2Document(
  blocks: Editor2BlockNode[],
  pageSettings?: Editor2PageSettings,
  sections?: Editor2Section[],
  styles?: Record<string, Editor2NamedStyle>,
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
    blocks,
    pageSettings: normalizedPageSettings,
    sections: sections ?? undefined,
    styles: styles ?? { ...DEFAULT_EDITOR2_STYLES },
  };
  nextDocumentId += 1;
  return document;
}

export function createEditor2StateFromDocument(
  document: Editor2Document,
  selection?: { paragraphIndex?: number; offset?: number },
): Editor2State {
  const hasSections = document.sections && document.sections.length > 0;
  const blocks = hasSections
    ? document.blocks
    : (document.blocks.length > 0 ? document.blocks : [createEditor2Paragraph("")]);
  const paragraphs = getDocumentParagraphs({
    ...document,
    blocks,
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

  const result = {
    document: {
      ...document,
      blocks,
      sections: hasSections ? document.sections : undefined,
    },
    selection: createCollapsedSelection(position),
    activeSectionIndex: 0,
    activeZone: "main" as Editor2EditingZone,
  };

  return result;
}

export function createInitialEditor2State(): Editor2State {
  const paragraph = createEditor2Paragraph("");
  const run = paragraph.runs[0]!;
  return {
    document: createEditor2Document([paragraph], undefined, []),
    selection: createCollapsedSelection({
      paragraphId: paragraph.id,
      runId: run.id,
      offset: 0,
    }),
    activeSectionIndex: 0,
    activeZone: "main" as Editor2EditingZone,
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
    activeZone: "main" as Editor2EditingZone,
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
    activeZone: "main" as Editor2EditingZone,
  };
}
