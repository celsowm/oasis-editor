import type {
  EditorBlockNode,
  EditorDocument,
  EditorEditingZone,
  EditorPageSettings,
  EditorParagraphNode,
  EditorPosition,
  EditorSection,
  EditorState,
  EditorTableCellNode,
  EditorTableNode,
  EditorTableRowNode,
  EditorTextRun,
  EditorTextStyle,
  EditorImageRunData,
  EditorNamedStyle,
} from "./model.js";
import {
  DEFAULT_EDITOR_PAGE_SETTINGS,
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

export function resetEditorIds(): void {
  nextDocumentId = 1;
  nextParagraphId = 1;
  nextRunId = 1;
  nextTableId = 1;
  nextTableRowId = 1;
  nextTableCellId = 1;
}

export function createEditorRun(text = ""): EditorTextRun {
  const run: EditorTextRun = {
    id: `run:${nextRunId}`,
    text,
  };
  nextRunId += 1;
  return run;
}

export function createEditorStyledRun(text = "", styles?: EditorTextStyle, image?: EditorImageRunData): EditorTextRun {
  const run = createEditorRun(text);
  if (styles) {
    run.styles = { ...styles };
  }
  if (image) {
    run.image = { ...image };
  }
  return run;
}

export function createEditorParagraph(text = ""): EditorParagraphNode {
  const paragraph: EditorParagraphNode = {
    id: `paragraph:${nextParagraphId}`,
    type: "paragraph",
    runs: [createEditorRun(text)],
  };
  nextParagraphId += 1;
  return paragraph;
}

export function createEditorParagraphFromRuns(
  runs: Array<{ text: string; styles?: EditorTextStyle; image?: EditorImageRunData }>,
): EditorParagraphNode {
  const paragraph: EditorParagraphNode = {
    id: `paragraph:${nextParagraphId}`,
    type: "paragraph",
    runs: runs.length > 0 ? runs.map((run) => createEditorStyledRun(run.text, run.styles, run.image)) : [createEditorRun("")],
  };
  nextParagraphId += 1;
  return paragraph;
}

export function createEditorTableCell(
  paragraphs: EditorParagraphNode[],
  colSpan = 1,
  options?: {
    rowSpan?: number;
    vMerge?: "restart" | "continue";
  },
): EditorTableCellNode {
  const cell: EditorTableCellNode = {
    id: `table-cell:${nextTableCellId}`,
    blocks: paragraphs.length > 0 ? paragraphs : [createEditorParagraph("")],
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

export function createEditorTableRow(
  cells: EditorTableCellNode[],
  options?: { isHeader?: boolean },
): EditorTableRowNode {
  const row: EditorTableRowNode = {
    id: `table-row:${nextTableRowId}`,
    cells,
  };
  if (options?.isHeader) {
    row.isHeader = true;
  }
  nextTableRowId += 1;
  return row;
}

export function createEditorTable(rows: EditorTableRowNode[]): EditorTableNode {
  const table: EditorTableNode = {
    id: `table:${nextTableId}`,
    type: "table",
    rows,
  };
  nextTableId += 1;
  return table;
}

export const DEFAULT_EDITOR_STYLES: Record<string, EditorNamedStyle> = {
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

export function createEditorDocument(
  blocks: EditorBlockNode[],
  pageSettings?: EditorPageSettings,
  sections?: EditorSection[],
  styles?: Record<string, EditorNamedStyle>,
): EditorDocument {
  const normalizedPageSettings = normalizePageSettings(
    pageSettings
      ? {
          width: pageSettings.width,
          height: pageSettings.height,
          orientation: pageSettings.orientation,
          margins: { ...pageSettings.margins },
        }
      : {
          width: DEFAULT_EDITOR_PAGE_SETTINGS.width,
          height: DEFAULT_EDITOR_PAGE_SETTINGS.height,
          orientation: DEFAULT_EDITOR_PAGE_SETTINGS.orientation,
          margins: { ...DEFAULT_EDITOR_PAGE_SETTINGS.margins },
        },
  );
  const document: EditorDocument = {
    id: `document:${nextDocumentId}`,
    blocks,
    pageSettings: normalizedPageSettings,
    sections: sections ?? undefined,
    styles: styles ?? { ...DEFAULT_EDITOR_STYLES },
  };
  nextDocumentId += 1;
  return document;
}

export function createEditorStateFromDocument(
  document: EditorDocument,
  selection?: { paragraphIndex?: number; offset?: number },
): EditorState {
  const hasSections = document.sections && document.sections.length > 0;
  const blocks = hasSections
    ? document.blocks
    : (document.blocks.length > 0 ? document.blocks : [createEditorParagraph("")]);
  const paragraphs = getDocumentParagraphs({
    ...document,
    blocks,
  });
  const paragraphIndex = Math.max(
    0,
    Math.min(selection?.paragraphIndex ?? 0, paragraphs.length - 1),
  );
  const paragraph = paragraphs[paragraphIndex]!;
  const position: EditorPosition = paragraphOffsetToPosition(
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
    activeZone: "main" as EditorEditingZone,
  };

  return result;
}

export function createInitialEditorState(): EditorState {
  const paragraph = createEditorParagraph("");
  const run = paragraph.runs[0]!;
  return {
    document: createEditorDocument([paragraph], undefined, []),
    selection: createCollapsedSelection({
      paragraphId: paragraph.id,
      runId: run.id,
      offset: 0,
    }),
    activeSectionIndex: 0,
    activeZone: "main" as EditorEditingZone,
  };
}

export function createEditorStateFromTexts(
  texts: string[],
  selection?: {
    anchor?: { blockIndex: number; offset: number };
    focus?: { blockIndex: number; offset: number };
    blockIndex?: number;
    offset?: number;
  },
): EditorState {
  const paragraphs =
    texts.length > 0 ? texts.map((text) => createEditorParagraph(text)) : [createEditorParagraph("")];
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
    document: createEditorDocument(paragraphs),
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
    activeZone: "main" as EditorEditingZone,
  };
}

export function createEditorStateFromParagraphRuns(
  paragraphsSpec: Array<Array<{ text: string; styles?: EditorTextStyle; image?: EditorImageRunData }>>,
  selection?: {
    anchor?: { blockIndex: number; offset: number };
    focus?: { blockIndex: number; offset: number };
    blockIndex?: number;
    offset?: number;
  },
): EditorState {
  const paragraphs =
    paragraphsSpec.length > 0
      ? paragraphsSpec.map((runs) => createEditorParagraphFromRuns(runs))
      : [createEditorParagraph("")];

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
    document: createEditorDocument(paragraphs),
    selection: {
      anchor: anchorPosition,
      focus: focusPosition,
    },
    activeSectionIndex: 0,
    activeZone: "main" as EditorEditingZone,
  };
}
