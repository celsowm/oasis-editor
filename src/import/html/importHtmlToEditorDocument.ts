import {
  createEditorDocument,
  createEditorParagraph,
  createEditorParagraphFromRuns,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import type {
  EditorBlockNode,
  EditorDocument,
  EditorParagraphListStyle,
  EditorParagraphNode,
  EditorTableCellNode,
  EditorTableRowNode,
  EditorTextRun,
  EditorTextStyle,
  EditorImageRunData,
} from "@/core/model.js";
import { getRunImage } from "@/core/model.js";
import {
  collectInlineRuns,
  isParagraphTag,
  listKindForTag,
} from "@/core/html/htmlBlockWalker.js";
import { parseParagraphStyle } from "@/core/html/htmlStyleParser.js";

const HEADING_STYLE_IDS: Record<string, string> = {
  H1: "heading1",
  H2: "heading2",
  H3: "heading3",
  H4: "heading3",
  H5: "heading3",
  H6: "heading3",
};

function runsToParagraphSpecs(
  runs: EditorTextRun[],
): Array<Parameters<typeof createEditorParagraphFromRuns>[0][number]> {
  return runs.map(
    (
      run,
    ): {
      text: string;
      styles: EditorTextStyle | undefined;
      image: EditorImageRunData | undefined;
    } => ({
      text: run.text,
      styles: run.styles,
      image: getRunImage(run),
    }),
  );
}

function buildParagraph(
  element: Element,
  list?: EditorParagraphListStyle,
): EditorParagraphNode {
  const runs = collectInlineRuns(element, undefined);
  const paragraph = createEditorParagraphFromRuns(runsToParagraphSpecs(runs));

  const paragraphStyle = parseParagraphStyle(element);
  const headingStyleId = HEADING_STYLE_IDS[element.tagName];
  if (paragraphStyle || headingStyleId) {
    paragraph.style = {
      ...(headingStyleId ? { styleId: headingStyleId } : {}),
      ...(paragraphStyle ?? {}),
    };
  }

  if (list) {
    paragraph.list = list;
  }
  return paragraph;
}

function buildListParagraphs(
  element: Element,
  kind: EditorParagraphListStyle["kind"],
  level: number,
): EditorParagraphNode[] {
  const paragraphs: EditorParagraphNode[] = [];
  for (const child of Array.from(element.children)) {
    if (child.tagName !== "LI") {
      continue;
    }
    paragraphs.push(buildParagraph(child, { kind, level }));

    // Nested lists inside the <li> contribute deeper-level paragraphs.
    for (const grandChild of Array.from(child.children)) {
      const nestedKind = listKindForTag(grandChild.tagName);
      if (nestedKind) {
        paragraphs.push(
          ...buildListParagraphs(grandChild, nestedKind, level + 1),
        );
      }
    }
  }
  return paragraphs;
}

function buildCell(element: Element): EditorTableCellNode {
  const blocks = collectBlocks(element);
  const paragraphs = blocks.filter(
    (block): block is EditorParagraphNode => block.type === "paragraph",
  );
  const colSpan = Number.parseInt(element.getAttribute("colspan") ?? "", 10);
  const rowSpan = Number.parseInt(element.getAttribute("rowspan") ?? "", 10);
  return createEditorTableCell(
    paragraphs.length > 0 ? paragraphs : [createEditorParagraph("")],
    Number.isFinite(colSpan) && colSpan > 1 ? colSpan : 1,
    Number.isFinite(rowSpan) && rowSpan > 1 ? { rowSpan } : undefined,
  );
}

function buildRow(element: Element): EditorTableRowNode | null {
  const cells: EditorTableCellNode[] = [];
  let isHeader = true;
  for (const child of Array.from(element.children)) {
    if (child.tagName === "TD" || child.tagName === "TH") {
      cells.push(buildCell(child));
      if (child.tagName !== "TH") {
        isHeader = false;
      }
    }
  }
  if (cells.length === 0) {
    return null;
  }
  return createEditorTableRow(cells, isHeader ? { isHeader: true } : undefined);
}

function buildTable(element: Element): EditorBlockNode | null {
  const rows: EditorTableRowNode[] = [];
  // Rows may sit directly under <table> or inside <thead>/<tbody>/<tfoot>.
  const rowElements = Array.from(element.querySelectorAll("tr")).filter(
    (tr): boolean => tr.closest("table") === element,
  );
  for (const tr of rowElements) {
    const row = buildRow(tr);
    if (row) {
      rows.push(row);
    }
  }
  if (rows.length === 0) {
    return null;
  }
  return createEditorTable(rows);
}

/**
 * Walks a list of sibling DOM nodes into editor block nodes (paragraphs and
 * tables). Used at the document root and recursively for table cell content.
 */
function collectBlocks(container: ParentNode): EditorBlockNode[] {
  const blocks: EditorBlockNode[] = [];

  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text.trim().length > 0) {
        blocks.push(buildParagraphFromRuns(collectInlineRuns(node, undefined)));
      }
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    const element = node as Element;

    if (element.tagName === "TABLE") {
      const table = buildTable(element);
      if (table) {
        blocks.push(table);
      }
      continue;
    }

    const listKind = listKindForTag(element.tagName);
    if (listKind) {
      blocks.push(...buildListParagraphs(element, listKind, 0));
      continue;
    }

    if (isParagraphTag(element.tagName)) {
      blocks.push(buildParagraph(element));
      continue;
    }

    // Structural wrappers (section, article, header, etc.): recurse so nested
    // paragraphs and tables are not lost.
    if (element.children.length > 0) {
      blocks.push(...collectBlocks(element));
      continue;
    }

    const runs = collectInlineRuns(element, undefined);
    if (runs.length > 0) {
      blocks.push(buildParagraphFromRuns(runs));
    }
  }

  return blocks;
}

function buildParagraphFromRuns(runs: EditorTextRun[]): EditorParagraphNode {
  return createEditorParagraphFromRuns(runsToParagraphSpecs(runs));
}

/**
 * Parses a full HTML document (or fragment) string into an `EditorDocument`.
 * Runs on the main thread reusing the browser DOM, so it must be called in a
 * window context (the importer adapter guarantees this).
 */
export function importHtmlToEditorDocument(html: string): EditorDocument {
  if (typeof document === "undefined") {
    throw new Error("importHtmlToEditorDocument requires a DOM environment");
  }

  const parsed = new DOMParser().parseFromString(html, "text/html");
  const body = parsed.body;

  const blocks = body ? collectBlocks(body) : [];
  if (blocks.length === 0) {
    blocks.push(createEditorParagraph(""));
  }

  const title = parsed.title.trim();
  const metadata = title ? { title } : undefined;

  return createEditorDocument(
    blocks,
    undefined,
    undefined,
    undefined,
    metadata,
  );
}
