import type {
  EditorBlockNode,
  EditorFootnote,
  EditorFootnoteReferenceData,
  EditorParagraphNode,
  EditorRunBase,
  EditorTableCellNode,
  EditorTableNode,
  EditorTableRowNode,
  EditorTextRun,
  EditorTextStyle,
  EditorTextBoxData,
  EditorImageRunData,
} from "../model.js";

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
        ? runs.map(
            (run): EditorTextRun =>
              createEditorStyledRun(
                run.text,
                run.styles,
                run.image,
                run.textBox,
              ),
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

export function createSectionBoundaryParagraph(
  zone: "header" | "footer",
): EditorParagraphNode {
  const paragraph = createEditorParagraph("");
  paragraph.style = { styleId: zone };
  return paragraph;
}
