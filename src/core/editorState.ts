import type {
  EditorAsset,
  EditorBlockNode,
  EditorDocument,
  EditorEditingZone,
  EditorFootnote,
  EditorFootnoteReferenceData,
  EditorPageSettings,
  EditorParagraphNode,
  EditorPosition,
  EditorSection,
  EditorState,
  EditorTableCellNode,
  EditorTableNode,
  EditorTableRowNode,
  EditorRunBase,
  EditorTextRun,
  EditorTextStyle,
  EditorTextBoxData,
  EditorImageRunData,
  EditorNamedStyle,
} from "./model.js";
import {
  DEFAULT_EDITOR_PAGE_SETTINGS,
  findParagraphLocation,
  getBlockParagraphs,
  getDocumentParagraphsCanonical,
  getDocumentSectionsCanonical,
  getParagraphLength,
  normalizePageSettings,
  paragraphOffsetToPosition,
} from "./model.js";
import { createCollapsedSelection } from "./selection.js";
import { DEFAULT_FONT_SIZE_PX } from "./units.js";

export type EditorNodeKind =
  | "document"
  | "paragraph"
  | "run"
  | "table"
  | "table-row"
  | "table-cell"
  | "footnote"
  | "bookmark"
  | "comment"
  | "sdt";

/**
 * Single authority for editor node IDs. Stateless and globally unique, so two
 * editors mounted on the same page never share a sequence. The `kind` prefix is
 * kept purely for debuggability; no code parses it for ordering or numbering.
 */
export function createEditorNodeId(kind: EditorNodeKind): string {
  return `${kind}:${crypto.randomUUID()}`;
}

export function createEditorBookmarkId(): string {
  return createEditorNodeId("bookmark");
}

export function createEditorCommentId(): string {
  return createEditorNodeId("comment");
}

export function createEditorRun(text = ""): EditorTextRun {
  return {
    id: createEditorNodeId("run"),
    text,
    kind: "text",
  };
}

export function createEditorStyledRun(
  text = "",
  styles?: EditorTextStyle,
  image?: EditorImageRunData,
  textBox?: EditorTextBoxData,
): EditorTextRun {
  const base: EditorRunBase = {
    id: createEditorNodeId("run"),
    text,
  };
  if (styles) {
    base.styles = { ...styles };
  }
  if (image) {
    return { ...base, kind: "image", image: { ...image } };
  }
  if (textBox) {
    return { ...base, kind: "textBox", textBox };
  }
  return { ...base, kind: "text" };
}

export function createEditorParagraph(text = ""): EditorParagraphNode {
  const paragraph: EditorParagraphNode = {
    id: createEditorNodeId("paragraph"),
    type: "paragraph",
    runs: [createEditorRun(text)],
  };
  return paragraph;
}

export function createEditorParagraphFromRuns(
  runs: Array<{
    text: string;
    styles?: EditorTextStyle;
    image?: EditorImageRunData;
    textBox?: EditorTextBoxData;
  }>,
): EditorParagraphNode {
  const paragraph: EditorParagraphNode = {
    id: createEditorNodeId("paragraph"),
    type: "paragraph",
    runs:
      runs.length > 0
        ? runs.map((run) =>
            createEditorStyledRun(run.text, run.styles, run.image, run.textBox),
          )
        : [createEditorRun("")],
  };
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
    id: createEditorNodeId("table-cell"),
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
  return cell;
}

export function createEditorTableRow(
  cells: EditorTableCellNode[],
  options?: { isHeader?: boolean },
): EditorTableRowNode {
  const row: EditorTableRowNode = {
    id: createEditorNodeId("table-row"),
    cells,
  };
  if (options?.isHeader) {
    row.isHeader = true;
  }
  return row;
}

export function createEditorTable(
  rows: EditorTableRowNode[],
  gridCols?: number[],
): EditorTableNode {
  const table: EditorTableNode = {
    id: createEditorNodeId("table"),
    type: "table",
    rows,
    gridCols,
  };
  return table;
}

export function createEditorFootnoteId(): string {
  return createEditorNodeId("footnote");
}

export function createEditorFootnote(
  blocks?: EditorBlockNode[],
): EditorFootnote {
  const initialBlocks: EditorBlockNode[] =
    blocks && blocks.length > 0
      ? blocks
      : [createEditorParagraphWithStyle("", { styleId: "footnoteText" })];
  return {
    id: createEditorFootnoteId(),
    blocks: initialBlocks,
  };
}

function createEditorParagraphWithStyle(
  text: string,
  style: { styleId?: string },
): EditorParagraphNode {
  const paragraph = createEditorParagraph(text);
  if (style.styleId) {
    paragraph.style = { styleId: style.styleId };
  }
  return paragraph;
}

export function createFootnoteReferenceRun(
  footnoteId: string,
  marker: string,
  options?: { customMark?: string; styles?: EditorTextStyle },
): EditorTextRun {
  const styles: EditorTextStyle = {
    styleId: "footnoteReference",
    superscript: true,
    ...(options?.styles ?? {}),
  };
  const reference: EditorFootnoteReferenceData = { footnoteId };
  if (options?.customMark) {
    reference.customMark = options.customMark;
  }
  return {
    id: createEditorNodeId("run"),
    text: marker,
    styles,
    kind: "footnoteReference",
    footnoteReference: reference,
  };
}

export const DEFAULT_EDITOR_STYLES: Record<string, EditorNamedStyle> = {
  normal: {
    id: "normal",
    name: "Normal",
    type: "paragraph",
    qFormat: true,
    uiPriority: 0,
    paragraphStyle: {
      spacingAfter: 8,
      lineHeight: 1.15,
    },
    textStyle: {
      fontFamily: "Calibri, sans-serif",
      fontSize: DEFAULT_FONT_SIZE_PX, // 11pt
    },
  },
  header: {
    id: "header",
    name: "Header",
    type: "paragraph",
    semiHidden: true,
    basedOn: "normal",
    nextStyle: "header",
    paragraphStyle: {
      spacingAfter: 0,
    },
  },
  footer: {
    id: "footer",
    name: "Footer",
    type: "paragraph",
    semiHidden: true,
    basedOn: "normal",
    nextStyle: "footer",
    paragraphStyle: {
      spacingAfter: 0,
    },
  },
  heading1: {
    id: "heading1",
    name: "Heading 1",
    type: "paragraph",
    qFormat: true,
    uiPriority: 10,
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
    qFormat: true,
    uiPriority: 11,
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
    qFormat: true,
    uiPriority: 12,
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
  footnoteText: {
    id: "footnoteText",
    name: "Footnote Text",
    type: "paragraph",
    semiHidden: true,
    basedOn: "normal",
    nextStyle: "footnoteText",
    paragraphStyle: {
      spacingAfter: 0,
      lineHeight: 1.0,
    },
    textStyle: {
      fontSize: 10,
    },
  },
  footnoteReference: {
    id: "footnoteReference",
    name: "Footnote Reference",
    type: "character",
    semiHidden: true,
    basedOn: "normal",
    textStyle: {
      superscript: true,
    },
  },
  Caption: {
    id: "Caption",
    name: "Caption",
    type: "paragraph",
    qFormat: true,
    uiPriority: 35,
    basedOn: "normal",
    nextStyle: "normal",
    paragraphStyle: {
      align: "center",
      spacingBefore: 4,
      spacingAfter: 8,
    },
    textStyle: {
      fontFamily: "Calibri, sans-serif",
      fontSize: 12,
      italic: true,
    },
  },
};

export function createEditorDocument(
  blocks: EditorBlockNode[],
  pageSettings?: EditorPageSettings,
  sections?: EditorSection[],
  styles?: Record<string, EditorNamedStyle>,
  metadata?: { title?: string; [key: string]: unknown },
  assets?: Record<string, EditorAsset>,
): EditorDocument {
  const normalizedPageSettings = normalizePageSettings(
    pageSettings
      ? {
          width: pageSettings.width,
          height: pageSettings.height,
          orientation: pageSettings.orientation,
          margins: { ...pageSettings.margins },
          ...(pageSettings.columns ? { columns: pageSettings.columns } : {}),
        }
      : {
          width: DEFAULT_EDITOR_PAGE_SETTINGS.width,
          height: DEFAULT_EDITOR_PAGE_SETTINGS.height,
          orientation: DEFAULT_EDITOR_PAGE_SETTINGS.orientation,
          margins: { ...DEFAULT_EDITOR_PAGE_SETTINGS.margins },
        },
  );
  const document: EditorDocument = {
    id: createEditorNodeId("document"),
    pageSettings: normalizedPageSettings,
    sections: sections ?? [
      {
        id: "section:default",
        blocks,
        pageSettings: normalizedPageSettings,
      },
    ],
    styles: styles ?? { ...DEFAULT_EDITOR_STYLES },
    metadata: metadata ?? { title: "Untitled document" },
    // The asset registry holds out-of-band image payloads (data URLs).
    // It must be carried through any document-rebuild path or `asset:<id>`
    // refs in image runs will dangle and the renderer will try to GET
    // "asset:img-1" as a URL.
    assets: assets ?? undefined,
  };
  return document;
}

export function getDocumentCharacterCount(document: EditorDocument): number {
  return getDocumentParagraphsCanonical(document).reduce(
    (sum, p) => sum + getParagraphLength(p),
    0,
  );
}

export function getDocumentWordCount(document: EditorDocument): number {
  const paragraphs = getDocumentParagraphsCanonical(document);
  let totalWords = 0;

  for (const paragraph of paragraphs) {
    const text = paragraph.runs.reduce((sum, run) => sum + run.text, "");
    if (!text.trim()) continue;

    // Split by whitespace and punctuation that typically separates words
    // This is a naive implementation but covers basic English/Portuguese needs
    const words = text.split(/[\s\p{P}]+/u).filter((word) => word.length > 0);
    totalWords += words.length;
  }

  return totalWords;
}

export function createEditorStateFromDocument(
  document: EditorDocument,
  selection?: { paragraphIndex?: number; offset?: number },
): EditorState {
  let normalizedDocument: EditorDocument = {
    ...document,
    sections:
      document.sections && document.sections.length > 0
        ? document.sections
        : [
            {
              id: "section:default",
              blocks: [createEditorParagraph("")],
              pageSettings:
                getDocumentSectionsCanonical(document)[0]?.pageSettings ??
                DEFAULT_EDITOR_PAGE_SETTINGS,
            },
          ],
  };

  let allParagraphs = getDocumentParagraphsCanonical(normalizedDocument);
  if (allParagraphs.length === 0) {
    const fallbackParagraph = createEditorParagraph("");
    const sections = getDocumentSectionsCanonical(normalizedDocument);
    const firstSection = sections[0];
    if (firstSection) {
      const nextSections = [...sections];
      nextSections[0] = {
        ...firstSection,
        blocks: [fallbackParagraph, ...firstSection.blocks],
      };
      normalizedDocument = {
        ...normalizedDocument,
        sections: nextSections,
      };
    }
    allParagraphs = getDocumentParagraphsCanonical(normalizedDocument);
  }

  const hasExplicitSelection = selection !== undefined;
  let targetParagraph = allParagraphs[0]!;
  let activeSectionIndex = 0;
  let activeZone: EditorEditingZone = "main";

  if (hasExplicitSelection) {
    const paragraphIndex = Math.max(
      0,
      Math.min(selection?.paragraphIndex ?? 0, allParagraphs.length - 1),
    );
    targetParagraph = allParagraphs[paragraphIndex]!;
    const location = findParagraphLocation(
      normalizedDocument,
      targetParagraph.id,
    );
    if (location) {
      activeSectionIndex = location.sectionIndex;
      activeZone = location.zone;
    }
  } else {
    const sections = getDocumentSectionsCanonical(normalizedDocument);
    const firstSection = sections[0];
    const mainParagraphs =
      firstSection?.blocks.flatMap(getBlockParagraphs) ?? [];
    if (mainParagraphs.length > 0) {
      targetParagraph = mainParagraphs[0]!;
      activeZone = "main";
      activeSectionIndex = 0;
    } else {
      const headerParagraphs =
        firstSection?.header?.flatMap(getBlockParagraphs) ?? [];
      const footerParagraphs =
        firstSection?.footer?.flatMap(getBlockParagraphs) ?? [];
      if (headerParagraphs.length > 0) {
        targetParagraph = headerParagraphs[0]!;
        activeZone = "header";
      } else if (footerParagraphs.length > 0) {
        targetParagraph = footerParagraphs[0]!;
        activeZone = "footer";
      }
      activeSectionIndex = 0;
    }
  }

  const position: EditorPosition = paragraphOffsetToPosition(
    targetParagraph,
    Math.max(
      0,
      Math.min(selection?.offset ?? 0, getParagraphLength(targetParagraph)),
    ),
  );

  const result = {
    document: normalizedDocument,
    selection: createCollapsedSelection(position),
    activeSectionIndex,
    activeZone,
  };

  return result;
}

export function createSectionBoundaryParagraph(
  zone: "header" | "footer",
): EditorParagraphNode {
  const paragraph = createEditorParagraph("");
  paragraph.style = { styleId: zone };
  return paragraph;
}

export function createInitialEditorState(): EditorState {
  const paragraph = createEditorParagraph("");
  const run = paragraph.runs[0]!;
  return {
    document: createEditorDocument([paragraph]),
    selection: createCollapsedSelection({
      paragraphId: paragraph.id,
      runId: run.id,
      offset: 0,
    }),
    activeSectionIndex: 0,
    activeZone: "main" as EditorEditingZone,
  };
}

type SelectionSpec = {
  anchor?: { blockIndex: number; offset: number };
  focus?: { blockIndex: number; offset: number };
  blockIndex?: number;
  offset?: number;
};

/** Clamps `value` to the closed interval [0, max]. */
function clampTo(value: number, max: number): number {
  return Math.max(0, Math.min(value, max));
}

function resolveSelectionIndexes(
  selection: SelectionSpec | undefined,
  paragraphCount: number,
): { anchorIndex: number; focusIndex: number } {
  const defaultIndex =
    selection?.blockIndex ?? selection?.anchor?.blockIndex ?? 0;
  const anchorIndex = clampTo(
    selection?.anchor?.blockIndex ?? defaultIndex,
    paragraphCount - 1,
  );
  const focusIndex = clampTo(
    selection?.focus?.blockIndex ?? selection?.blockIndex ?? anchorIndex,
    paragraphCount - 1,
  );
  return { anchorIndex, focusIndex };
}

export function createEditorStateFromTexts(
  texts: string[],
  selection?: SelectionSpec,
): EditorState {
  const paragraphs =
    texts.length > 0
      ? texts.map((text) => createEditorParagraph(text))
      : [createEditorParagraph("")];
  const { anchorIndex, focusIndex } = resolveSelectionIndexes(
    selection,
    paragraphs.length,
  );
  const anchorParagraph = paragraphs[anchorIndex];
  const focusParagraph = paragraphs[focusIndex];
  const anchorRun = anchorParagraph.runs[0];
  const focusRun = focusParagraph.runs[0];
  const anchorOffset = selection?.anchor?.offset ?? selection?.offset ?? 0;
  const focusOffset =
    selection?.focus?.offset ?? selection?.offset ?? anchorOffset;

  return {
    document: createEditorDocument(paragraphs),
    selection: {
      anchor: {
        paragraphId: anchorParagraph.id,
        runId: anchorRun.id,
        offset: clampTo(anchorOffset, anchorRun.text.length),
      },
      focus: {
        paragraphId: focusParagraph.id,
        runId: focusRun.id,
        offset: clampTo(focusOffset, focusRun.text.length),
      },
    },
    activeSectionIndex: 0,
    activeZone: "main" as EditorEditingZone,
  };
}

export function createEditorStateFromParagraphRuns(
  paragraphsSpec: Array<
    Array<{
      text: string;
      styles?: EditorTextStyle;
      image?: EditorImageRunData;
    }>
  >,
  selection?: SelectionSpec,
): EditorState {
  const paragraphs =
    paragraphsSpec.length > 0
      ? paragraphsSpec.map((runs) => createEditorParagraphFromRuns(runs))
      : [createEditorParagraph("")];

  const { anchorIndex, focusIndex } = resolveSelectionIndexes(
    selection,
    paragraphs.length,
  );
  const anchorParagraph = paragraphs[anchorIndex];
  const focusParagraph = paragraphs[focusIndex];
  const anchorOffset = selection?.anchor?.offset ?? selection?.offset ?? 0;
  const focusOffset =
    selection?.focus?.offset ?? selection?.offset ?? anchorOffset;
  const anchorLength = anchorParagraph.runs.reduce(
    (sum, run) => sum + run.text.length,
    0,
  );
  const focusLength = focusParagraph.runs.reduce(
    (sum, run) => sum + run.text.length,
    0,
  );
  const anchorPosition = paragraphOffsetToPosition(
    anchorParagraph,
    clampTo(anchorOffset, anchorLength),
  );
  const focusPosition = paragraphOffsetToPosition(
    focusParagraph,
    clampTo(focusOffset, focusLength),
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
