import type {
  EditorBlockNode,
  EditorParagraphListStyle,
  EditorParagraphStyle,
  EditorParagraphNode,
  EditorPosition,
  EditorSelection,
  EditorState,
  EditorTextRun,
  EditorTextStyle,
  EditorImageRunData,
  EditorSection,
  EditorTableCellStyle,
  EditorBorderStyle,
  EditorTableCellNode,
  EditorTableNode,
  EditorTableStyle,
  EditorTableRowStyle,
  EditorTabStop,
} from "./model.js";
import {
  getBlockParagraphs,
  getDocumentSections,
  getParagraphLength,
  getParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
  getActiveSectionIndex,
  getActiveZone,
  findParagraphTableLocation,
} from "./model.js";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorParagraphFromRuns,
  createEditorStyledRun,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "./editorState.js";
import {
  clampPosition,
  createCollapsedSelection,
  findParagraphIndex,
  isSelectionCollapsed,
  normalizeSelection,
} from "./selection.js";
import { buildTableCellLayout } from "./tableLayout.js";

type ToggleableTextStyleKey =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "superscript"
  | "subscript";

type ValueTextStyleKey = "fontFamily" | "fontSize" | "color" | "highlight" | "link";
type ValueParagraphStyleKey =
  | "styleId"
  | "align"
  | "spacingBefore"
  | "spacingAfter"
  | "lineHeight"
  | "indentLeft"
  | "indentRight"
  | "indentFirstLine"
  | "indentHanging"
  | "shading"
  | "borderTop"
  | "borderRight"
  | "borderBottom"
  | "borderLeft"
  | "tabs"
  | "pageBreakBefore"
  | "keepWithNext";
type ParagraphListKind = EditorParagraphListStyle["kind"];

function cloneStyle(style?: EditorTextStyle): EditorTextStyle | undefined {
  return style ? { ...style } : undefined;
}

function stylesEqual(left?: EditorTextStyle, right?: EditorTextStyle): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function setBooleanStyle(
  style: EditorTextStyle | undefined,
  key: ToggleableTextStyleKey,
  enabled: boolean,
): EditorTextStyle | undefined {
  const next = { ...(style ?? {}) } as EditorTextStyle & Record<string, unknown>;

  if (enabled) {
    next[key] = true;
  } else {
    delete next[key];
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function setValueStyle<K extends ValueTextStyleKey>(
  style: EditorTextStyle | undefined,
  key: K,
  value: EditorTextStyle[K] | null,
): EditorTextStyle | undefined {
  const next = { ...(style ?? {}) } as Record<string, unknown>;

  if (value === null || value === undefined || value === "") {
    delete next[key];
  } else {
    next[key] = value;
  }

  return Object.keys(next).length > 0 ? (next as EditorTextStyle) : undefined;
}

function cloneRun(run: EditorTextRun): EditorTextRun {
  return {
    ...run,
    styles: cloneStyle(run.styles),
  };
}

function cloneParagraph(paragraph: EditorParagraphNode): EditorParagraphNode {
  return {
    ...paragraph,
    runs: paragraph.runs.map(cloneRun),
    style: paragraph.style ? { ...paragraph.style } : undefined,
    list: paragraph.list ? { ...paragraph.list } : undefined,
  };
}

function cloneParagraphList(
  list?: EditorParagraphListStyle,
): EditorParagraphListStyle | undefined {
  return list ? { ...list } : undefined;
}

function setParagraphStyleValue<K extends ValueParagraphStyleKey>(
  style: EditorParagraphStyle | undefined,
  key: K,
  value: EditorParagraphStyle[K] | null,
): EditorParagraphStyle | undefined {
  const next = { ...(style ?? {}) } as Record<string, unknown>;

  if (value === null || value === undefined) {
    delete next[key];
  } else {
    next[key] = value;
  }

  return Object.keys(next).length > 0 ? (next as EditorParagraphStyle) : undefined;
}

function cloneParagraphs(paragraphs: EditorParagraphNode[]): EditorParagraphNode[] {
  return paragraphs.map(cloneParagraph);
}

function cloneBlocks(blocks: EditorBlockNode[]): EditorBlockNode[] {
  return blocks.map((block) => {
    if (block.type === "paragraph") {
      return cloneParagraph(block);
    }
    return {
      ...block,
      rows: block.rows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => ({
          ...cell,
          blocks: cloneParagraphs(cell.blocks),
        })),
      })),
    };
  });
}

function normalizeRuns(runs: EditorTextRun[], fallbackStyles?: EditorTextStyle): EditorTextRun[] {
  const merged: EditorTextRun[] = [];

  for (const run of runs) {
    if (run.text.length === 0) {
      continue;
    }

    const previous = merged[merged.length - 1];
    if (previous && !run.image && !previous.image && stylesEqual(previous.styles, run.styles)) {
      previous.text += run.text;
      continue;
    }

    merged.push({
      ...run,
      styles: cloneStyle(run.styles),
    });
  }

  if (merged.length > 0) {
    return merged;
  }

  return [createEditorStyledRun("", fallbackStyles)];
}

function buildParagraphFromRuns(
  paragraph: EditorParagraphNode,
  runs: EditorTextRun[],
  fallbackStyles?: EditorTextStyle,
): EditorParagraphNode {
  return {
    ...paragraph,
    runs: normalizeRuns(runs, fallbackStyles),
    style: paragraph.style ? { ...paragraph.style } : undefined,
  };
}

function createParagraphFromRuns(
  textRuns: Array<{ text: string; styles?: EditorTextStyle }>,
): EditorParagraphNode {
  return createEditorParagraphFromRuns(textRuns);
}

function createParagraphFromRunsLike(
  paragraph: EditorParagraphNode,
  textRuns: Array<{ text: string; styles?: EditorTextStyle }>,
): EditorParagraphNode {
  const nextParagraph = createParagraphFromRuns(textRuns);
  nextParagraph.style = paragraph.style ? { ...paragraph.style } : undefined;
  nextParagraph.list = cloneParagraphList(paragraph.list);
  return nextParagraph;
}

function cloneParagraphWithListLevel(
  paragraph: EditorParagraphNode,
  level: number,
): EditorParagraphNode {
  const nextParagraph = cloneParagraph(paragraph);
  if (!nextParagraph.list) {
    return nextParagraph;
  }

  nextParagraph.list = {
    ...nextParagraph.list,
    level: Math.max(0, level),
  };
  return nextParagraph;
}

function clearParagraphList(paragraph: EditorParagraphNode): EditorParagraphNode {
  const nextParagraph = cloneParagraph(paragraph);
  delete nextParagraph.list;
  return nextParagraph;
}

function blocksContainTables(nodes: EditorBlockNode[]): boolean {
  for (const node of nodes) {
    if (node.type === "table") {
      return true;
    }
  }
  return false;
}

function replaceParagraphsInBlocks(blocks: EditorBlockNode[], newParagraphs: EditorParagraphNode[]): EditorBlockNode[] {
  // Fast path: when the zone contains no tables, the flat paragraph list from
  // `getParagraphs(state)` IS the canonical block list. Replace wholesale so
  // that paragraph-count changes (split, merge via deleteBackward, etc.) are
  // reflected. The structure-preserving walk below assumes a 1:1 mapping and
  // would silently drop split halves or leave merged paragraphs behind.
  if (!blocksContainTables(blocks)) {
    return newParagraphs;
  }

  let index = 0;
  const processBlocks = (nodes: EditorBlockNode[]): EditorBlockNode[] => {
    return nodes.map(node => {
      if (node.type === "paragraph") {
        return newParagraphs[index++] ?? node;
      }
      return {
        ...node,
        rows: node.rows.map(row => ({
          ...row,
          cells: row.cells.map(cell => ({
            ...cell,
            blocks: processBlocks(cell.blocks) as EditorParagraphNode[]
          }))
        }))
      };
    });
  };
  return processBlocks(blocks);
}

function replaceParagraphsInSection(
  section: EditorSection,
  paragraphs: EditorParagraphNode[],
  zone: "main" | "header" | "footer",
): EditorSection {
  if (zone === "header") {
    return { ...section, header: replaceParagraphsInBlocks(section.header ?? [], paragraphs) };
  }
  if (zone === "footer") {
    return { ...section, footer: replaceParagraphsInBlocks(section.footer ?? [], paragraphs) };
  }

  // main zone: preserve table structure
  return { ...section, blocks: replaceParagraphsInBlocks(section.blocks, paragraphs) };
}

function cloneStateWithParagraphs(
  state: EditorState,
  paragraphs: EditorParagraphNode[],
  selection: EditorSelection,
): EditorState {
  const hasSections = state.document.sections && state.document.sections.length > 0;

  if (hasSections) {
    const sectionIndex = getActiveSectionIndex(state);
    const zone = getActiveZone(state);
    const section = state.document.sections![sectionIndex];

    if (section) {
      const updatedSection = replaceParagraphsInSection(section, paragraphs, zone);
      const updatedSections = [...state.document.sections!];
      updatedSections[sectionIndex] = updatedSection;

      return {
        ...state,
        document: {
          ...state.document,
          sections: updatedSections,
        },
        selection,
      };
    }
  }

  // Legacy fallback: for documents with tables, use replaceParagraphsInBlocks to preserve table structure
  const hasTableInBlocks = state.document.blocks.some(b => b.type === "table");

  if (hasTableInBlocks) {
    return {
      ...state,
      document: {
        ...state.document,
        blocks: replaceParagraphsInBlocks(state.document.blocks, paragraphs),
      },
      selection,
    };
  }

  return {
    ...state,
    document: createEditorDocument(paragraphs, state.document.pageSettings, state.document.sections),
    selection,
  };
}

function withSelection(position: EditorPosition): EditorSelection {
  return createCollapsedSelection(position);
}

function getFocusParagraph(state: EditorState): {
  paragraph: EditorParagraphNode;
  index: number;
  offset: number;
} {
  const paragraphs = getParagraphs(state);
  const focus = clampPosition(state, state.selection.focus);
  const index = findParagraphIndex(paragraphs, focus.paragraphId);
  const paragraph = paragraphs[index];
  return {
    paragraph,
    index,
    offset: positionToParagraphOffset(paragraph, focus),
  };
}

export function getSelectedImageRun(
  state: EditorState,
): {
  paragraph: EditorParagraphNode;
  paragraphIndex: number;
  run: EditorTextRun;
  runIndex: number;
  offset: number;
} | null {
  const normalized = normalizeSelection(state);
  if (
    normalized.isCollapsed ||
    normalized.startIndex !== normalized.endIndex ||
    normalized.endParagraphOffset - normalized.startParagraphOffset !== 1
  ) {
    return null;
  }

  const paragraphs = getParagraphs(state);
  const paragraph = paragraphs[normalized.startIndex];
  if (!paragraph) {
    return null;
  }

  let consumed = 0;
  for (let index = 0; index < paragraph.runs.length; index += 1) {
    const run = paragraph.runs[index]!;
    const startOffset = consumed;
    consumed += run.text.length;
    if (run.image && run.text.length === 1 && startOffset === normalized.startParagraphOffset) {
      return {
        paragraph,
        paragraphIndex: normalized.startIndex,
        run,
        runIndex: index,
        offset: startOffset,
      };
    }
  }

  return null;
}

function getStyleAtOffset(paragraph: EditorParagraphNode, offset: number): EditorTextStyle | undefined {
  if (paragraph.runs.length === 0) {
    return undefined;
  }

  let consumed = 0;
  for (let index = 0; index < paragraph.runs.length; index += 1) {
    const run = paragraph.runs[index];
    const nextConsumed = consumed + run.text.length;

    if (offset < nextConsumed) {
      return cloneStyle(run.styles);
    }

    if (offset === nextConsumed) {
      if (run.text.length > 0) {
        return cloneStyle(run.styles);
      }
      const nextRun = paragraph.runs[index + 1];
      return cloneStyle(nextRun?.styles ?? run.styles);
    }

    consumed = nextConsumed;
  }

  return cloneStyle(paragraph.runs[paragraph.runs.length - 1]?.styles);
}

function getRunAtOffset(
  paragraph: EditorParagraphNode,
  offset: number,
): { run: EditorTextRun; startOffset: number; endOffset: number } | null {
  let consumed = 0;
  for (let index = 0; index < paragraph.runs.length; index += 1) {
    const run = paragraph.runs[index]!;
    const startOffset = consumed;
    const endOffset = consumed + run.text.length;

    if (offset < endOffset) {
      return { run, startOffset, endOffset };
    }

    if (offset === endOffset) {
      if (run.text.length > 0) {
        return { run, startOffset, endOffset };
      }
      const nextRun = paragraph.runs[index + 1];
      if (nextRun) {
        return {
          run: nextRun,
          startOffset: endOffset,
          endOffset: endOffset + nextRun.text.length,
        };
      }
      return { run, startOffset, endOffset };
    }

    consumed = endOffset;
  }

  return null;
}

function expandLinkRangeInParagraph(
  paragraph: EditorParagraphNode,
  offset: number,
): { href: string; startOffset: number; endOffset: number } | null {
  const resolved = getRunAtOffset(paragraph, offset);
  const href = resolved?.run.styles?.link;
  if (!resolved || !href || resolved.run.image) {
    return null;
  }

  let startOffset = resolved.startOffset;
  let endOffset = resolved.endOffset;
  let consumed = 0;
  const runs = paragraph.runs;
  const runIndex = runs.findIndex((run) => run.id === resolved.run.id);
  if (runIndex === -1) {
    return null;
  }

  for (let index = 0; index < runIndex; index += 1) {
    consumed += runs[index]!.text.length;
  }

  startOffset = consumed;
  endOffset = consumed + resolved.run.text.length;

  for (let index = runIndex - 1; index >= 0; index -= 1) {
    const run = runs[index]!;
    if (run.image || run.styles?.link !== href) {
      break;
    }
    startOffset -= run.text.length;
  }

  for (let index = runIndex + 1; index < runs.length; index += 1) {
    const run = runs[index]!;
    if (run.image || run.styles?.link !== href) {
      break;
    }
    endOffset += run.text.length;
  }

  return { href, startOffset, endOffset };
}

function sliceRuns(
  paragraph: EditorParagraphNode,
  startOffset: number,
  endOffset: number,
): EditorTextRun[] {
  const start = Math.max(0, Math.min(startOffset, getParagraphLength(paragraph)));
  const end = Math.max(start, Math.min(endOffset, getParagraphLength(paragraph)));
  const pieces: EditorTextRun[] = [];

  let consumed = 0;
  for (const run of paragraph.runs) {
    const runStart = consumed;
    const runEnd = consumed + run.text.length;
    const overlapStart = Math.max(start, runStart);
    const overlapEnd = Math.min(end, runEnd);

    if (overlapStart < overlapEnd) {
      const piece: EditorTextRun = {
        id: `run:${Math.random().toString(36).slice(2, 9)}`,
        text: run.image ? "\uFFFC" : run.text.slice(overlapStart - runStart, overlapEnd - runStart),
      };
      if (run.styles) {
        piece.styles = { ...run.styles };
      }
      if (run.image) {
        piece.image = { ...run.image };
      }
      if (run.revision) {
        piece.revision = { ...run.revision };
      }
      if (run.field) {
        piece.field = { ...run.field };
      }
      pieces.push(piece);
    }

    consumed = runEnd;
  }

  return pieces;
}

function insertRunsAtOffset(
  paragraph: EditorParagraphNode,
  offset: number,
  textRuns: EditorTextRun[],
): EditorParagraphNode {
  const beforeRuns = sliceRuns(paragraph, 0, offset);
  const afterRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  const fallbackStyles = getStyleAtOffset(paragraph, offset);

  return buildParagraphFromRuns(
    paragraph,
    [
      ...beforeRuns,
      ...textRuns.map((run) => ({
        ...run,
        styles: cloneStyle(run.styles ?? fallbackStyles),
      })),
      ...afterRuns,
    ],
    fallbackStyles,
  );
}

function deleteSelectionRange(state: EditorState): EditorState {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  const paragraphs = getParagraphs(state);

  if (state.trackChangesEnabled) {
    const revisionId = `rev:${Math.random().toString(36).slice(2, 9)}`;
    const author = "User";
    const date = Date.now();

    const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
      if (paragraphIndex < normalized.startIndex || paragraphIndex > normalized.endIndex) {
        return cloneParagraph(paragraph);
      }

      const startOffset = paragraphIndex === normalized.startIndex ? normalized.startParagraphOffset : 0;
      const endOffset =
        paragraphIndex === normalized.endIndex
          ? normalized.endParagraphOffset
          : getParagraphLength(paragraph);

      return mapRunsInRange(paragraph, startOffset, endOffset, (run) => {
        // If already an insert, remove it
        if (run.revision?.type === "insert") {
          return { ...run, text: "" }; // normalizeRuns will remove this
        }
        // Otherwise mark as delete
        return {
          ...run,
          revision: { id: revisionId, type: "delete", author, date },
        };
      });
    });

    return cloneStateWithParagraphs(
      state,
      nextParagraphs,
      withSelection(normalized.start),
    );
  }

  const startParagraph = paragraphs[normalized.startIndex];
  const endParagraph = paragraphs[normalized.endIndex];
  const startOffset = positionToParagraphOffset(startParagraph, normalized.start);
  const endOffset = positionToParagraphOffset(endParagraph, normalized.end);
  const mergedParagraph = buildParagraphFromRuns(startParagraph, [
    ...sliceRuns(startParagraph, 0, startOffset),
    ...sliceRuns(endParagraph, endOffset, getParagraphLength(endParagraph)),
  ]);

  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, normalized.startIndex)),
    mergedParagraph,
    ...cloneParagraphs(paragraphs.slice(normalized.endIndex + 1)),
  ];

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(mergedParagraph, startOffset)),
  );
}

function mapRunsInRange(
  paragraph: EditorParagraphNode,
  startOffset: number,
  endOffset: number,
  mapper: (run: EditorTextRun) => EditorTextRun,
): EditorParagraphNode {
  return buildParagraphFromRuns(paragraph, [
    ...sliceRuns(paragraph, 0, startOffset),
    ...sliceRuns(paragraph, startOffset, endOffset).map(mapper),
    ...sliceRuns(paragraph, endOffset, getParagraphLength(paragraph)),
  ]);
}

function preserveSelectionByParagraphOffsets(
  paragraphs: EditorParagraphNode[],
  normalized: ReturnType<typeof normalizeSelection>,
): EditorSelection {
  const startParagraph = paragraphs[normalized.startIndex]!;
  const endParagraph = paragraphs[normalized.endIndex]!;

  return {
    anchor: paragraphOffsetToPosition(startParagraph, normalized.startParagraphOffset),
    focus: paragraphOffsetToPosition(endParagraph, normalized.endParagraphOffset),
  };
}

function collapseToBoundary(state: EditorState, direction: "start" | "end"): EditorState {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  return {
    document: state.document,
    selection: withSelection(direction === "start" ? normalized.start : normalized.end),
  };
}

export function getSelectedText(state: EditorState): string {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return "";
  }

  const paragraphs = getParagraphs(state);
  if (normalized.startIndex === normalized.endIndex) {
    const paragraph = paragraphs[normalized.startIndex];
    const text = getParagraphText(paragraph);
    return text.slice(normalized.startParagraphOffset, normalized.endParagraphOffset);
  }

  const parts: string[] = [];
  const startParagraph = paragraphs[normalized.startIndex];
  const endParagraph = paragraphs[normalized.endIndex];

  parts.push(getParagraphText(startParagraph).slice(normalized.startParagraphOffset));
  for (let index = normalized.startIndex + 1; index < normalized.endIndex; index += 1) {
    parts.push(getParagraphText(paragraphs[index]));
  }
  parts.push(getParagraphText(endParagraph).slice(0, normalized.endParagraphOffset));

  return parts.join("\n");
}

export interface EditorClipboardParagraphSpec {
  runs: Array<{ text: string; styles?: EditorTextStyle; image?: EditorImageRunData }>;
  style?: EditorParagraphStyle;
  list?: EditorParagraphListStyle;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textRunStylesToCss(style?: EditorTextStyle): string {
  if (!style) {
    return "";
  }

  const parts: string[] = [];
  if (style.fontFamily) {
    parts.push(`font-family:${style.fontFamily}`);
  }
  if (style.fontSize !== undefined && style.fontSize !== null) {
    parts.push(`font-size:${style.fontSize}px`);
  }
  if (style.color) {
    parts.push(`color:${style.color}`);
  }
  if (style.highlight) {
    parts.push(`background-color:${style.highlight}`);
  }
  if (style.superscript) {
    parts.push("vertical-align:super");
    parts.push("font-size:0.75em");
  } else if (style.subscript) {
    parts.push("vertical-align:sub");
    parts.push("font-size:0.75em");
  }
  if (style.bold) {
    parts.push("font-weight:700");
  }
  if (style.italic) {
    parts.push("font-style:italic");
  }
  const decorations: string[] = [];
  if (style.underline || style.link) {
    decorations.push("underline");
  }
  if (style.strike) {
    decorations.push("line-through");
  }
  if (decorations.length > 0) {
    parts.push(`text-decoration:${decorations.join(" ")}`);
  }

  return parts.join(";");
}

function paragraphStyleToCssText(style?: EditorParagraphStyle): string {
  if (!style) {
    return "";
  }

  const parts: string[] = [];
  if (style.align) {
    parts.push(`text-align:${style.align}`);
  }
  if (style.lineHeight !== undefined && style.lineHeight !== null) {
    parts.push(`line-height:${style.lineHeight}`);
  }
  if (style.spacingBefore !== undefined && style.spacingBefore !== null) {
    parts.push(`padding-top:${style.spacingBefore}px`);
  }
  if (style.spacingAfter !== undefined && style.spacingAfter !== null) {
    parts.push(`padding-bottom:${style.spacingAfter}px`);
  }
  if (style.indentLeft !== undefined && style.indentLeft !== null) {
    parts.push(`padding-left:${style.indentLeft}px`);
  }
  if (style.indentRight !== undefined && style.indentRight !== null) {
    parts.push(`padding-right:${style.indentRight}px`);
  }
  if (style.indentFirstLine !== undefined && style.indentFirstLine !== null) {
    parts.push(`text-indent:${style.indentFirstLine}px`);
  }
  return parts.join(";");
}

function serializeImageRunToHtml(run: EditorTextRun): string {
  if (!run.image) {
    return "";
  }

  const altAttr = run.image.alt !== undefined ? ` alt="${escapeHtml(run.image.alt)}"` : "";
  const img = `<img src="${escapeHtml(run.image.src)}" width="${Math.max(1, Math.round(run.image.width))}" height="${Math.max(1, Math.round(run.image.height))}"${altAttr}>`;
  if (run.styles?.link) {
    return `<a href="${escapeHtml(run.styles.link)}">${img}</a>`;
  }

  return img;
}

function serializeTextRunToHtml(run: EditorTextRun): string {
  if (run.image) {
    return serializeImageRunToHtml(run);
  }

  const text = escapeHtml(run.text).replace(/\n/g, "<br>");
  let html = text;
  const style = run.styles ?? undefined;
  if (style?.strike) {
    html = `<s>${html}</s>`;
  }
  if (style?.underline) {
    html = `<u>${html}</u>`;
  }
  if (style?.italic) {
    html = `<em>${html}</em>`;
  }
  if (style?.bold) {
    html = `<strong>${html}</strong>`;
  }
  if (style?.superscript) {
    html = `<sup>${html}</sup>`;
  } else if (style?.subscript) {
    html = `<sub>${html}</sub>`;
  }

  const css = textRunStylesToCss(style);
  if (css.length > 0) {
    html = `<span style="${css}">${html}</span>`;
  }
  if (style?.link) {
    html = `<a href="${escapeHtml(style.link)}">${html}</a>`;
  }
  return html;
}

function serializeParagraphRunsToHtml(runs: EditorTextRun[]): string {
  return runs.map((run) => serializeTextRunToHtml(run)).join("") || "<br>";
}

export function serializeEditorSelectionToHtml(state: EditorState): string {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return "";
  }

  const paragraphs = getParagraphs(state);
  const htmlParts: string[] = [];
  let activeListKind: EditorParagraphListStyle["kind"] | null = null;

  const closeList = () => {
    if (activeListKind) {
      htmlParts.push(activeListKind === "bullet" ? "</ul>" : "</ol>");
      activeListKind = null;
    }
  };

  for (let index = normalized.startIndex; index <= normalized.endIndex; index += 1) {
    const paragraph = paragraphs[index];
    if (!paragraph) {
      continue;
    }

    const startOffset = index === normalized.startIndex ? normalized.startParagraphOffset : 0;
    const endOffset = index === normalized.endIndex ? normalized.endParagraphOffset : getParagraphLength(paragraph);
    const runs = sliceRuns(paragraph, startOffset, endOffset);
    const css = paragraphStyleToCssText(paragraph.style);
    const attrs = css.length > 0 ? ` style="${css}"` : "";
    const paragraphHtml = serializeParagraphRunsToHtml(runs);

    if (paragraph.list?.kind) {
      const wrapperTag = paragraph.list.kind === "bullet" ? "ul" : "ol";
      if (activeListKind !== paragraph.list.kind) {
        closeList();
        htmlParts.push(`<${wrapperTag}>`);
        activeListKind = paragraph.list.kind;
      }
      htmlParts.push(`<li${attrs}>${paragraphHtml}</li>`);
      continue;
    }

    closeList();
    htmlParts.push(`<p${attrs}>${paragraphHtml}</p>`);
  }

  closeList();
  return htmlParts.join("");
}

function parseInlineStyles(element: Element): EditorTextStyle | undefined {
  const style = (element as HTMLElement).style;
  const result: EditorTextStyle = {};

  const fontFamily = style.fontFamily.trim();
  if (fontFamily) {
    result.fontFamily = fontFamily;
  }

  const fontSize = style.fontSize.trim();
  if (fontSize.endsWith("px")) {
    const parsed = Number.parseFloat(fontSize);
    if (Number.isFinite(parsed)) {
      result.fontSize = parsed;
    }
  }

  const color = style.color.trim();
  if (color) {
    result.color = color;
  }

  const backgroundColor = style.backgroundColor.trim();
  if (backgroundColor) {
    result.highlight = backgroundColor;
  }

  const textDecoration = style.textDecoration.toLowerCase();
  if (textDecoration.includes("underline")) {
    result.underline = true;
  }
  if (textDecoration.includes("line-through")) {
    result.strike = true;
  }

  const fontWeight = style.fontWeight.trim();
  if (fontWeight === "bold" || Number.parseInt(fontWeight, 10) >= 600) {
    result.bold = true;
  }

  const fontStyle = style.fontStyle.trim();
  if (fontStyle === "italic") {
    result.italic = true;
  }

  if (element.tagName === "SUP") {
    result.superscript = true;
  }
  if (element.tagName === "SUB") {
    result.subscript = true;
  }

  const link = element.tagName === "A" ? (element as HTMLAnchorElement).getAttribute("href")?.trim() ?? "" : "";
  if (link) {
    result.link = link;
    result.underline = true;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function parseInlineImage(element: Element): EditorImageRunData | undefined {
  if (element.tagName !== "IMG") {
    return undefined;
  }

  const img = element as HTMLImageElement;
  const src = img.getAttribute("src")?.trim() ?? "";
  if (!src) {
    return undefined;
  }

  const widthAttr = img.getAttribute("width")?.trim() ?? "";
  const heightAttr = img.getAttribute("height")?.trim() ?? "";
  const widthStyle = img.style.width.trim();
  const heightStyle = img.style.height.trim();
  const widthFromStyle = widthStyle.endsWith("px") ? Number.parseFloat(widthStyle) : Number.NaN;
  const heightFromStyle = heightStyle.endsWith("px") ? Number.parseFloat(heightStyle) : Number.NaN;
  const widthFromAttr = Number.parseFloat(widthAttr);
  const heightFromAttr = Number.parseFloat(heightAttr);

  const width = Number.isFinite(widthFromStyle)
    ? widthFromStyle
    : Number.isFinite(widthFromAttr)
      ? widthFromAttr
      : 100;
  const height = Number.isFinite(heightFromStyle)
    ? heightFromStyle
    : Number.isFinite(heightFromAttr)
      ? heightFromAttr
      : 100;
  const altAttr = img.getAttribute("alt");

  const image: EditorImageRunData = {
    src,
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };

  if (altAttr !== null) {
    image.alt = altAttr;
  }

  return image;
}

function parseParagraphStyle(element: Element): EditorParagraphStyle | undefined {
  const style = (element as HTMLElement).style;
  const result: EditorParagraphStyle = {};

  const align = style.textAlign.trim();
  if (align === "left" || align === "center" || align === "right" || align === "justify") {
    result.align = align;
  }

  const lineHeight = style.lineHeight.trim();
  if (lineHeight) {
    const parsed = Number.parseFloat(lineHeight);
    if (Number.isFinite(parsed)) {
      result.lineHeight = parsed;
    }
  }

  const paddingTop = style.paddingTop.trim();
  if (paddingTop.endsWith("px")) {
    const parsed = Number.parseFloat(paddingTop);
    if (Number.isFinite(parsed)) {
      result.spacingBefore = parsed;
    }
  }

  const paddingBottom = style.paddingBottom.trim();
  if (paddingBottom.endsWith("px")) {
    const parsed = Number.parseFloat(paddingBottom);
    if (Number.isFinite(parsed)) {
      result.spacingAfter = parsed;
    }
  }

  const paddingLeft = style.paddingLeft.trim();
  if (paddingLeft.endsWith("px")) {
    const parsed = Number.parseFloat(paddingLeft);
    if (Number.isFinite(parsed)) {
      result.indentLeft = parsed;
    }
  }

  const paddingRight = style.paddingRight.trim();
  if (paddingRight.endsWith("px")) {
    const parsed = Number.parseFloat(paddingRight);
    if (Number.isFinite(parsed)) {
      result.indentRight = parsed;
    }
  }

  const textIndent = style.textIndent.trim();
  if (textIndent.endsWith("px")) {
    const parsed = Number.parseFloat(textIndent);
    if (Number.isFinite(parsed)) {
      result.indentFirstLine = parsed;
    }
  }

  if (style.breakBefore === "page" || (element as HTMLElement).dataset.oasisPageBreakBefore === "true") {
    result.pageBreakBefore = true;
  }

  if ((element as HTMLElement).dataset.oasisKeepWithNext === "true") {
    result.keepWithNext = true;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export function parseEditorClipboardHtml(html: string): EditorClipboardParagraphSpec[] {
  if (typeof document === "undefined" || html.trim().length === 0) {
    return [];
  }

  const template = document.createElement("template");
  template.innerHTML = html;

  const paragraphs: EditorClipboardParagraphSpec[] = [];
  const rootNodes = Array.from(template.content.childNodes);

  const appendParagraph = (element: Element | null, runs: EditorTextRun[], list?: EditorParagraphListStyle) => {
    const fallbackRuns = runs.length > 0 ? runs : [createEditorStyledRun("")];
    paragraphs.push({
      runs: fallbackRuns.map((run) => ({
        text: run.text,
        styles: cloneStyle(run.styles),
        image: run.image ? { ...run.image } : undefined,
      })),
      style: element ? parseParagraphStyle(element) : undefined,
      list,
    });
  };

  const collectInlineRuns = (node: Node, inheritedStyle: EditorTextStyle | undefined): EditorTextRun[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      return text.length > 0 ? [createEditorStyledRun(text, inheritedStyle)] : [];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return [];
    }

    const element = node as Element;
    if (element.tagName === "BR") {
      return [createEditorStyledRun("\n", inheritedStyle)];
    }

    const image = parseInlineImage(element);
    if (image) {
      return [createEditorStyledRun("\uFFFC", inheritedStyle, image)];
    }

    const nextStyle = {
      ...(inheritedStyle ?? {}),
      ...(parseInlineStyles(element) ?? {}),
    } as EditorTextStyle;
    const childRuns: EditorTextRun[] = [];
    for (const child of Array.from(element.childNodes)) {
      childRuns.push(...collectInlineRuns(child, nextStyle));
    }
    return childRuns;
  };

  const processList = (element: Element, kind: EditorParagraphListStyle["kind"]) => {
    for (const child of Array.from(element.children)) {
      if (child.tagName !== "LI") {
        continue;
      }
      appendParagraph(child, collectInlineRuns(child, undefined), { kind, level: 0 });
    }
  };

  for (const node of rootNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text.trim().length > 0) {
        appendParagraph(null, [createEditorStyledRun(text)]);
      }
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    const element = node as Element;
    if (element.tagName === "UL") {
      processList(element, "bullet");
      continue;
    }

    if (element.tagName === "OL") {
      processList(element, "ordered");
      continue;
    }

    if (element.tagName === "P" || element.tagName === "DIV" || element.tagName === "LI" || /^H[1-6]$/.test(element.tagName)) {
      appendParagraph(element, collectInlineRuns(element, undefined), element.tagName === "LI" ? { kind: "bullet", level: 0 } : undefined);
      continue;
    }

    const inlineRuns = collectInlineRuns(element, undefined);
    if (inlineRuns.length > 0) {
      appendParagraph(null, inlineRuns);
    }
  }

  return paragraphs;
}

export function insertClipboardParagraphsAtSelection(
  state: EditorState,
  paragraphsSpec: EditorClipboardParagraphSpec[],
): EditorState {
  if (paragraphsSpec.length === 0) {
    return state;
  }

  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const paragraphs = getParagraphs(collapsedState);
  const beforeRuns = sliceRuns(paragraph, 0, offset);
  const afterRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  const pastedParagraphs = paragraphsSpec.map((spec) => {
    const nextParagraph = createEditorParagraphFromRuns(
      spec.runs.map((run) => ({
        text: run.text,
        styles: cloneStyle(run.styles),
        image: run.image ? { ...run.image } : undefined,
      })),
    );
    nextParagraph.style = spec.style ? { ...spec.style } : undefined;
    nextParagraph.list = spec.list ? { ...spec.list } : undefined;
    return nextParagraph;
  });

  let nextParagraphs: EditorParagraphNode[];
  let nextSelection = withSelection(paragraphOffsetToPosition(paragraph, offset));

  if (pastedParagraphs.length === 1) {
    const source = pastedParagraphs[0]!;
    const sourceLength = source.runs.reduce((total, run) => total + run.text.length, 0);
    const mergedParagraph = buildParagraphFromRuns(
      paragraph,
      [
        ...beforeRuns,
        ...source.runs.map(cloneRun),
        ...afterRuns,
      ],
      getStyleAtOffset(paragraph, offset),
    );
    mergedParagraph.style = paragraph.style ? { ...paragraph.style } : source.style ? { ...source.style } : undefined;
    mergedParagraph.list = paragraph.list ? { ...paragraph.list } : source.list ? { ...source.list } : undefined;
    nextParagraphs = [
      ...cloneParagraphs(paragraphs.slice(0, index)),
      mergedParagraph,
      ...cloneParagraphs(paragraphs.slice(index + 1)),
    ];
    nextSelection = withSelection(
      paragraphOffsetToPosition(mergedParagraph, beforeRuns.reduce((total, run) => total + run.text.length, 0) + sourceLength),
    );
  } else {
    const firstSource = pastedParagraphs[0]!;
    const lastSource = pastedParagraphs[pastedParagraphs.length - 1]!;
    const lastSourceLength = lastSource.runs.reduce((total, run) => total + run.text.length, 0);
    const firstParagraph = buildParagraphFromRuns(
      paragraph,
      [
        ...beforeRuns,
        ...firstSource.runs.map(cloneRun),
      ],
      getStyleAtOffset(paragraph, offset),
    );
    firstParagraph.style = paragraph.style ? { ...paragraph.style } : firstSource.style ? { ...firstSource.style } : undefined;
    firstParagraph.list = paragraph.list ? { ...paragraph.list } : firstSource.list ? { ...firstSource.list } : undefined;

    const middleParagraphs = pastedParagraphs.slice(1, -1).map(cloneParagraph);

    const lastParagraph = buildParagraphFromRuns(
      lastSource,
      [
        ...lastSource.runs.map(cloneRun),
        ...afterRuns,
      ],
      undefined,
    );
    lastParagraph.list = lastSource.list ? { ...lastSource.list } : undefined;

    nextParagraphs = [
      ...cloneParagraphs(paragraphs.slice(0, index)),
      firstParagraph,
      ...middleParagraphs,
      lastParagraph,
      ...cloneParagraphs(paragraphs.slice(index + 1)),
    ];
    nextSelection = withSelection(paragraphOffsetToPosition(lastParagraph, lastSourceLength));
  }

  return cloneStateWithParagraphs(collapsedState, nextParagraphs, nextSelection);
}

export function insertClipboardHtmlAtSelection(state: EditorState, html: string): EditorState {
  return insertClipboardParagraphsAtSelection(state, parseEditorClipboardHtml(html));
}

export function setSelection(state: EditorState, selection: EditorSelection): EditorState {
  return {
    ...state,
    selection: {
      anchor: clampPosition(state, selection.anchor),
      focus: clampPosition(state, selection.focus),
    },
  };
}

export function toggleTrackChanges(state: EditorState): EditorState {
  return {
    ...state,
    trackChangesEnabled: !state.trackChangesEnabled,
  };
}

export function acceptRevision(state: EditorState, revisionId: string): EditorState {
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((paragraph) => {
    const nextRuns = paragraph.runs
      .filter((run) => !(run.revision?.id === revisionId && run.revision.type === "delete"))
      .map((run) => {
        if (run.revision?.id === revisionId && run.revision.type === "insert") {
          const nextRun = { ...run };
          delete nextRun.revision;
          return nextRun;
        }
        return run;
      });

    if (nextRuns.length === paragraph.runs.length && nextRuns.every((run, i) => run === paragraph.runs[i])) {
      return paragraph;
    }

    return buildParagraphFromRuns(paragraph, nextRuns);
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalizeSelection(state)),
  );
}

export function rejectRevision(state: EditorState, revisionId: string): EditorState {
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((paragraph) => {
    const nextRuns = paragraph.runs
      .filter((run) => !(run.revision?.id === revisionId && run.revision.type === "insert"))
      .map((run) => {
        if (run.revision?.id === revisionId && run.revision.type === "delete") {
          const nextRun = { ...run };
          delete nextRun.revision;
          return nextRun;
        }
        return run;
      });

    if (nextRuns.length === paragraph.runs.length && nextRuns.every((run, i) => run === paragraph.runs[i])) {
      return paragraph;
    }

    return buildParagraphFromRuns(paragraph, nextRuns);
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalizeSelection(state)),
  );
}

export function insertTextAtSelection(state: EditorState, text: string): EditorState {
  if (text.length === 0) {
    return state;
  }

  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const styles = getStyleAtOffset(paragraph, offset);
  
  const insertedRun: EditorTextRun = {
    id: `run:${Math.random().toString(36).slice(2, 9)}`,
    text,
    styles,
  };

  if (collapsedState.trackChangesEnabled) {
    insertedRun.revision = {
      id: `rev:${Math.random().toString(36).slice(2, 9)}`,
      type: "insert",
      author: "User", // TODO: Get from context
      date: Date.now(),
    };
  }

  const nextParagraph = insertRunsAtOffset(paragraph, offset, [insertedRun]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
    candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
  );

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(nextParagraph, offset + text.length)),
  );
}

export function insertImageAtSelection(state: EditorState, image: EditorImageRunData): EditorState {
  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  
  const insertedRun = createEditorStyledRun("\uFFFC", getStyleAtOffset(paragraph, offset), image);
  const nextParagraph = insertRunsAtOffset(paragraph, offset, [insertedRun]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
    candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
  );

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(nextParagraph, offset + 1)),
  );
}

export function resizeSelectedImage(
  state: EditorState,
  width: number,
  height: number,
): EditorState {
  const selectedImage = getSelectedImageRun(state);
  if (!selectedImage) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const { paragraphIndex, run: targetRun } = selectedImage;

  const nextParagraphs = paragraphs.map((candidate, candidateIndex) => {
    if (candidateIndex !== paragraphIndex) {
      return cloneParagraph(candidate);
    }

    return {
      ...cloneParagraph(candidate),
      runs: candidate.runs.map((run) =>
        run.id === targetRun.id && run.image
          ? {
              ...run,
              image: {
                ...run.image,
                width: Math.max(24, Math.round(width)),
                height: Math.max(24, Math.round(height)),
              },
            }
          : cloneRun(run),
      ),
    };
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalizeSelection(state)),
  );
}

export function getSelectedImageAlt(state: EditorState): string | null {
  const selectedImage = getSelectedImageRun(state);
  if (!selectedImage?.run.image) {
    return null;
  }

  return selectedImage.run.image.alt ?? null;
}

export function setSelectedImageAlt(state: EditorState, alt: string | null): EditorState {
  const selectedImage = getSelectedImageRun(state);
  if (!selectedImage?.run.image) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((candidate, candidateIndex) => {
    if (candidateIndex !== selectedImage.paragraphIndex) {
      return cloneParagraph(candidate);
    }

    return {
      ...cloneParagraph(candidate),
      runs: candidate.runs.map((run) =>
        run.id === selectedImage.run.id && run.image
          ? {
              ...run,
              image: {
                ...run.image,
                alt: alt ?? undefined,
              },
            }
          : cloneRun(run),
      ),
    };
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalizeSelection(state)),
  );
}

export function moveBlockToPosition(
  state: EditorState,
  blockId: string,
  targetPosition: EditorPosition,
): EditorState {
  console.log("[moveBlockToPosition] Start move. BlockId:", blockId, "Target:", targetPosition.paragraphId);
  
  // 1. Find and remove the block from its current location
  let movedBlock: EditorBlockNode | undefined;
  
  const removeFromBlocks = (blocks: EditorBlockNode[]): EditorBlockNode[] => {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx >= 0) {
      movedBlock = blocks[idx];
      return [...blocks.slice(0, idx), ...blocks.slice(idx + 1)];
    }
    return blocks;
  };

  const removeFromSections = (sections: EditorSection[]): EditorSection[] => {
    return sections.map(s => ({
      ...s,
      blocks: removeFromBlocks(s.blocks),
      header: s.header ? removeFromBlocks(s.header) : undefined,
      footer: s.footer ? removeFromBlocks(s.footer) : undefined,
    }));
  };

  let nextDocument = { ...state.document };
  if (nextDocument.sections && nextDocument.sections.length > 0) {
    nextDocument.sections = removeFromSections(nextDocument.sections);
  } else {
    nextDocument.blocks = removeFromBlocks(nextDocument.blocks);
  }

  if (!movedBlock) {
    console.error("[moveBlockToPosition] Failed to find block to move:", blockId);
    return state;
  }

  // 2. Identify the target block and zone
  const targetId = targetPosition.paragraphId;
  
  // Check if target is inside the moved block itself
  if (movedBlock.type === "table") {
      const internalParagraphs = getBlockParagraphs(movedBlock);
      if (internalParagraphs.some(p => p.id === targetId)) {
          console.warn("[moveBlockToPosition] Target is inside the moved block. Aborting move to avoid self-nesting.");
          return state;
      }
  }

  const insertIntoBlocks = (blocks: EditorBlockNode[]): { nextBlocks: EditorBlockNode[]; found: boolean } => {
    const idx = blocks.findIndex(b => {
        if (b.id === targetId) return true;
        if (b.type === "table") {
            return getBlockParagraphs(b).some(p => p.id === targetId);
        }
        return false;
    });

    if (idx < 0) return { nextBlocks: blocks, found: false };

    // Insert BEFORE the block containing the target paragraph
    console.log("[moveBlockToPosition] Found target at block index:", idx);
    const nextBlocks = [...blocks.slice(0, idx), movedBlock!, ...blocks.slice(idx)];
    return { nextBlocks, found: true };
  };

  if (nextDocument.sections && nextDocument.sections.length > 0) {
    const activeIdx = getActiveSectionIndex(state);
    const zone = getActiveZone(state);
    const section = { ...nextDocument.sections[activeIdx]! };
    let found = false;

    if (zone === "header") {
      const res = insertIntoBlocks(section.header ?? []);
      section.header = res.nextBlocks;
      found = res.found;
    } else if (zone === "footer") {
      const res = insertIntoBlocks(section.footer ?? []);
      section.footer = res.nextBlocks;
      found = res.found;
    } else {
      const res = insertIntoBlocks(section.blocks);
      section.blocks = res.nextBlocks;
      found = res.found;
    }

    if (!found) {
        console.log("[moveBlockToPosition] Target not found in active zone, appending to main blocks");
        section.blocks = [...section.blocks, movedBlock];
    }

    nextDocument.sections = [...nextDocument.sections];
    nextDocument.sections[activeIdx] = section;
  } else {
    const res = insertIntoBlocks(nextDocument.blocks);
    if (res.found) {
        nextDocument.blocks = res.nextBlocks;
    } else {
        console.log("[moveBlockToPosition] Target not found in blocks, appending");
        nextDocument.blocks = [...nextDocument.blocks, movedBlock];
    }
  }

  console.log("[moveBlockToPosition] Move complete.");
  return {
    ...state,
    document: nextDocument,
  };
}
export function moveSelectedImageToPosition(
  state: EditorState,
  targetPosition: EditorPosition,
): EditorState {
  const selectedImage = getSelectedImageRun(state);
  if (!selectedImage) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const { paragraphIndex: sourceIndex, offset: sourceOffset, run: imageRun } = selectedImage;

  const targetIndex = findParagraphIndex(paragraphs, targetPosition.paragraphId);
  if (targetIndex < 0) {
    return state;
  }

  const targetParagraph = paragraphs[targetIndex];
  const targetOffsetRaw = positionToParagraphOffset(targetParagraph, targetPosition);
  const adjustedTargetOffset =
    targetIndex === sourceIndex && targetOffsetRaw > sourceOffset
      ? targetOffsetRaw - 1
      : targetOffsetRaw;

  if (targetIndex === sourceIndex && adjustedTargetOffset === sourceOffset) {
    return state;
  }

  const removeImageFromParagraph = (paragraph: EditorParagraphNode): EditorParagraphNode =>
    buildParagraphFromRuns(paragraph, [
      ...sliceRuns(paragraph, 0, sourceOffset),
      ...sliceRuns(paragraph, sourceOffset + 1, getParagraphLength(paragraph)),
    ]);

  const insertImageIntoParagraph = (
    paragraph: EditorParagraphNode,
    offset: number,
  ): EditorParagraphNode =>
    insertRunsAtOffset(
      paragraph,
      Math.max(0, Math.min(offset, getParagraphLength(paragraph))),
      [createEditorStyledRun("\uFFFC", getStyleAtOffset(paragraph, offset), imageRun.image)],
    );

  const nextParagraphs = paragraphs.map((paragraph, index) => {
    if (index === sourceIndex && index === targetIndex) {
      return insertImageIntoParagraph(removeImageFromParagraph(paragraph), adjustedTargetOffset);
    }

    if (index === sourceIndex) {
      return removeImageFromParagraph(paragraph);
    }

    if (index === targetIndex) {
      return insertImageIntoParagraph(paragraph, adjustedTargetOffset);
    }

    return cloneParagraphs([paragraph])[0]!;
  });

  const insertedParagraph = nextParagraphs[targetIndex];
  const insertedOffset = Math.max(0, Math.min(adjustedTargetOffset + 1, getParagraphLength(insertedParagraph)));

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(insertedParagraph, insertedOffset)),
  );
}

export function acceptRevisionsInSelection(state: EditorState): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const revisionIds = new Set<string>();

  for (let i = normalized.startIndex; i <= normalized.endIndex; i += 1) {
    const paragraph = paragraphs[i];
    const startOffset = i === normalized.startIndex ? normalized.startParagraphOffset : 0;
    const endOffset = i === normalized.endIndex ? normalized.endParagraphOffset : getParagraphLength(paragraph);
    const runs = sliceRuns(paragraph, startOffset, endOffset);
    for (const run of runs) {
      if (run.revision?.id) {
        revisionIds.add(run.revision.id);
      }
    }
  }

  let nextState = state;
  for (const revisionId of revisionIds) {
    nextState = acceptRevision(nextState, revisionId);
  }

  return nextState;
}

export function rejectRevisionsInSelection(state: EditorState): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const revisionIds = new Set<string>();

  for (let i = normalized.startIndex; i <= normalized.endIndex; i += 1) {
    const paragraph = paragraphs[i];
    const startOffset = i === normalized.startIndex ? normalized.startParagraphOffset : 0;
    const endOffset = i === normalized.endIndex ? normalized.endParagraphOffset : getParagraphLength(paragraph);
    const runs = sliceRuns(paragraph, startOffset, endOffset);
    for (const run of runs) {
      if (run.revision?.id) {
        revisionIds.add(run.revision.id);
      }
    }
  }

  let nextState = state;
  for (const revisionId of revisionIds) {
    nextState = rejectRevision(nextState, revisionId);
  }

  return nextState;
}

function updateTableCellsInBlocks(
  blocks: EditorBlockNode[],
  selectedParagraphIds: Set<string>,
  updateCell: (cell: EditorTableCellNode) => EditorTableCellNode
): EditorBlockNode[] {
  return blocks.map(block => {
    if (block.type === "paragraph") return block;
    
    return {
      ...block,
      rows: block.rows.map(row => ({
        ...row,
        cells: row.cells.map(cell => {
          // Check if this cell contains any of the selected paragraphs
          const isSelected = cell.blocks.some(p => selectedParagraphIds.has(p.id));
          return isSelected ? updateCell(cell) : cell;
        })
      }))
    };
  });
}

export function setTableCellStyleValue<K extends keyof EditorTableCellStyle>(
  state: EditorState,
  key: K,
  value: EditorTableCellStyle[K] | null,
): EditorState {
  const selectedParagraphIds = new Set<string>();
  const activeSectionIndex = getActiveSectionIndex(state);
  const anchorLoc = findParagraphTableLocation(state.document, state.selection.anchor.paragraphId, activeSectionIndex);
  const focusLoc = findParagraphTableLocation(state.document, state.selection.focus.paragraphId, activeSectionIndex);

  if (anchorLoc && focusLoc && anchorLoc.blockIndex === focusLoc.blockIndex && anchorLoc.zone === focusLoc.zone) {
    // Table-aware selection: identify all cells in the rectangular range
    const sections = getDocumentSections(state.document);
    const section = sections[activeSectionIndex];
    if (section) {
      const blocks = anchorLoc.zone === "header" ? section.header : anchorLoc.zone === "footer" ? section.footer : section.blocks;
      const tableBlock = blocks?.[anchorLoc.blockIndex];
      if (tableBlock && tableBlock.type === "table") {
        const tableLayout = buildTableCellLayout(tableBlock);
        const anchorCell = tableLayout.find(e => e.rowIndex === anchorLoc.rowIndex && e.cellIndex === anchorLoc.cellIndex);
        const focusCell = tableLayout.find(e => e.rowIndex === focusLoc.rowIndex && e.cellIndex === focusLoc.cellIndex);

        if (anchorCell && focusCell) {
          const startRow = Math.min(anchorCell.visualRowIndex, focusCell.visualRowIndex);
          const endRow = Math.max(anchorCell.visualRowIndex + anchorCell.rowSpan - 1, focusCell.visualRowIndex + focusCell.rowSpan - 1);
          const startCol = Math.min(anchorCell.visualColumnIndex, focusCell.visualColumnIndex);
          const endCol = Math.max(anchorCell.visualColumnIndex + anchorCell.colSpan - 1, focusCell.visualColumnIndex + focusCell.colSpan - 1);

          const cells = tableLayout.filter(entry => {
            return (
              entry.visualRowIndex <= endRow &&
              entry.visualRowIndex + entry.rowSpan - 1 >= startRow &&
              entry.visualColumnIndex <= endCol &&
              entry.visualColumnIndex + entry.colSpan - 1 >= startCol
            );
          });

          for (const entry of cells) {
            for (const p of entry.cell.blocks) {
              selectedParagraphIds.add(p.id);
            }
          }
        }
      }
    }
  }

  // Fallback to linear selection if not a table-specific selection or if table lookup failed
  if (selectedParagraphIds.size === 0) {
    const normalized = normalizeSelection(state);
    const paragraphs = getParagraphs(state);
    for (let i = normalized.startIndex; i <= normalized.endIndex; i += 1) {
      selectedParagraphIds.add(paragraphs[i].id);
    }
  }

  const updateCell = (cell: EditorTableCellNode): EditorTableCellNode => {
    const nextStyle = { ...(cell.style ?? {}) } as Record<string, unknown>;
    if (value === null) {
      delete nextStyle[key];
    } else {
      nextStyle[key] = value;
    }
    return {
      ...cell,
      style: Object.keys(nextStyle).length > 0 ? (nextStyle as EditorTableCellStyle) : undefined
    };
  };

  const sections = getDocumentSections(state.document);
  const hasSections = state.document.sections && state.document.sections.length > 0;

  if (hasSections) {
    const nextSections = sections.map(section => ({
      ...section,
      blocks: updateTableCellsInBlocks(section.blocks, selectedParagraphIds, updateCell),
      header: section.header ? updateTableCellsInBlocks(section.header, selectedParagraphIds, updateCell) : undefined,
      footer: section.footer ? updateTableCellsInBlocks(section.footer, selectedParagraphIds, updateCell) : undefined,
    }));

    return {
      ...state,
      document: {
        ...state.document,
        sections: nextSections
      }
    };
  }

  return {
    ...state,
    document: {
      ...state.document,
      blocks: updateTableCellsInBlocks(state.document.blocks, selectedParagraphIds, updateCell)
    }
  };
}

export function setTableStyleValue<K extends keyof EditorTableStyle>(
  state: EditorState,
  key: K,
  value: EditorTableStyle[K] | null,
): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const selectedParagraphIds = new Set<string>();

  for (let i = normalized.startIndex; i <= normalized.endIndex; i += 1) {
    selectedParagraphIds.add(paragraphs[i].id);
  }

  const updateTable = (table: EditorTableNode): EditorTableNode => {
    const nextStyle = { ...(table.style ?? {}) } as Record<string, unknown>;
    if (value === null) {
      delete nextStyle[key];
    } else {
      nextStyle[key] = value;
    }
    return {
      ...table,
      style: Object.keys(nextStyle).length > 0 ? (nextStyle as EditorTableStyle) : undefined
    };
  };

  const updateBlocks = (blocks: EditorBlockNode[]): EditorBlockNode[] => {
    return blocks.map(block => {
      if (block.type === "paragraph") return block;
      
      const paragraphsInTable = getBlockParagraphs(block);
      const isSelected = paragraphsInTable.some(p => selectedParagraphIds.has(p.id));

      const updatedRows = block.rows.map(row => ({
        ...row,
        cells: row.cells.map(cell => ({
          ...cell,
          blocks: updateBlocks(cell.blocks) as EditorParagraphNode[]
        }))
      }));

      const nextTable = { ...block, rows: updatedRows };
      return isSelected ? updateTable(nextTable) : nextTable;
    });
  };

  const sections = getDocumentSections(state.document);
  const hasSections = state.document.sections && state.document.sections.length > 0;

  if (hasSections) {
    const nextSections = sections.map(section => ({
      ...section,
      blocks: updateBlocks(section.blocks),
      header: section.header ? updateBlocks(section.header) : undefined,
      footer: section.footer ? updateBlocks(section.footer) : undefined,
    }));

    return {
      ...state,
      document: {
        ...state.document,
        sections: nextSections
      }
    };
  }

  return {
    ...state,
    document: {
      ...state.document,
      blocks: updateBlocks(state.document.blocks)
    }
  };
}

export function setTableCellWidth(state: EditorState, width: number | string | null): EditorState {
  return setTableCellStyleValue(state, "width", width);
}

export function setTableRowHeight(
  state: EditorState,
  tableId: string,
  rowIndex: number,
  height: number | string | null,
): EditorState {
  console.log("[EditorCommands] setTableRowHeight:", tableId, "Row:", rowIndex, "Height:", height);
  const updateTable = (table: EditorTableNode): EditorTableNode => {
    if (table.id !== tableId) return table;
    const nextRows = [...table.rows];
    const row = nextRows[rowIndex];
    if (row) {
      const nextStyle = { ...(row.style ?? {}) } as Record<string, unknown>;
      if (height === null) {
        delete nextStyle.height;
      } else {
        nextStyle.height = height;
      }
      nextRows[rowIndex] = {
        ...row,
        style: Object.keys(nextStyle).length > 0 ? (nextStyle as EditorTableRowStyle) : undefined,
      };
      console.log("[EditorCommands] Updated row style:", nextRows[rowIndex].style);
    }
    return { ...table, rows: nextRows };
  };

  const updateBlocks = (blocks: EditorBlockNode[]): EditorBlockNode[] => {
    return blocks.map((block) => {
      if (block.type === "table") {
        return updateTable(block);
      }
      return block;
    });
  };

  if (state.document.sections && state.document.sections.length > 0) {
    const nextSections = state.document.sections.map((section) => ({
      ...section,
      blocks: updateBlocks(section.blocks),
      header: section.header ? updateBlocks(section.header) : undefined,
      footer: section.footer ? updateBlocks(section.footer) : undefined,
    }));
    return {
      ...state,
      document: { ...state.document, sections: nextSections },
    };
  }

  return {
    ...state,
    document: {
      ...state.document,
      blocks: updateBlocks(state.document.blocks),
    },
  };
}

export function setTableColumnWidths(
  state: EditorState,
  tableId: string,
  columnWidths: Record<number, number | string>, // visualColumnIndex -> width
  tableWidth?: number | string
): EditorState {
  console.log("[EditorCommands] setTableColumnWidths. Table:", tableId, "Widths:", columnWidths, "TableWidth:", tableWidth);
  const updateTable = (table: EditorTableNode): EditorTableNode => {
    if (table.id !== tableId) return table;

    const tableLayout = buildTableCellLayout(table);
    const nextRows = table.rows.map((row, rowIndex) => {
      const nextCells = row.cells.map((cell, cellIndex) => {
        const entry = tableLayout.find(
          (e) => e.rowIndex === rowIndex && e.cellIndex === cellIndex,
        );
        if (!entry) return cell;

        const rightVisualColumnIndex = entry.visualColumnIndex + entry.colSpan - 1;
        const newWidth = columnWidths[rightVisualColumnIndex];

        if (newWidth !== undefined) {
          if (entry.colSpan === 1) {
             console.log(`[EditorCommands] Updating cell at row ${rowIndex} col ${cellIndex} to ${newWidth}pt`);
             return {
                ...cell,
                style: {
                  ...(cell.style ?? {}),
                  width: typeof newWidth === "number" ? newWidth : newWidth,
                },
              };
          }
        }

        return cell;
      });
      return { ...row, cells: nextCells };
    });

    const nextStyle = { ...(table.style ?? {}) } as any;
    if (tableWidth !== undefined) {
      nextStyle.width = tableWidth;
      console.log(`[EditorCommands] Updating table total width to ${tableWidth}pt`);
    }

    return { 
      ...table, 
      rows: nextRows,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : undefined
    };
  };
  const updateBlocks = (blocks: EditorBlockNode[]): EditorBlockNode[] => {
    return blocks.map((block) => {
      if (block.type === "table") {
        return updateTable(block);
      }
      return block;
    });
  };

  if (state.document.sections && state.document.sections.length > 0) {
    const nextSections = state.document.sections.map((section) => ({
      ...section,
      blocks: updateBlocks(section.blocks),
      header: section.header ? updateBlocks(section.header) : undefined,
      footer: section.footer ? updateBlocks(section.footer) : undefined,
    }));
    return {
      ...state,
      document: { ...state.document, sections: nextSections },
    };
  }

  return {
    ...state,
    document: {
      ...state.document,
      blocks: updateBlocks(state.document.blocks),
    },
  };
}

export function setTableCellBorders(
  state: EditorState,
  border: EditorBorderStyle | null
): EditorState {
  let nextState = setTableCellStyleValue(state, "borderTop", border);
  nextState = setTableCellStyleValue(nextState, "borderRight", border);
  nextState = setTableCellStyleValue(nextState, "borderBottom", border);
  nextState = setTableCellStyleValue(nextState, "borderLeft", border);
  return nextState;
}

export function insertTableAtSelection(state: EditorState, rows: number, cols: number): EditorState {
  const tableRows = [];
  for (let r = 0; r < rows; r += 1) {
    const cells = [];
    for (let c = 0; c < cols; c += 1) {
      cells.push(createEditorTableCell([createEditorParagraph("")]));
    }
    tableRows.push(createEditorTableRow(cells));
  }
  const table = createEditorTable(tableRows);

  const focus = clampPosition(state, state.selection.focus);
  const sections = getDocumentSections(state.document);
  const activeSectionIndex = getActiveSectionIndex(state);
  const zone = getActiveZone(state);

  const insertIntoBlocks = (blocks: EditorBlockNode[]): { nextBlocks: EditorBlockNode[]; found: boolean } => {
    const blockIndex = blocks.findIndex((b) => {
      if (b.id === focus.paragraphId) return true;
      if (b.type === "paragraph") return false;
      return getBlockParagraphs(b).some((p) => p.id === focus.paragraphId);
    });

    if (blockIndex === -1) {
      return { nextBlocks: blocks, found: false };
    }

    return {
      nextBlocks: [...blocks.slice(0, blockIndex + 1), table, ...blocks.slice(blockIndex + 1)],
      found: true,
    };
  };

  if (state.document.sections && state.document.sections.length > 0) {
    const section = sections[activeSectionIndex];
    if (!section) return state;

    const nextSection = { ...section };
    let found = false;

    if (zone === "header") {
      const result = insertIntoBlocks(section.header ?? []);
      nextSection.header = result.nextBlocks;
      found = result.found;
    } else if (zone === "footer") {
      const result = insertIntoBlocks(section.footer ?? []);
      nextSection.footer = result.nextBlocks;
      found = result.found;
    } else {
      const result = insertIntoBlocks(section.blocks);
      nextSection.blocks = result.nextBlocks;
      found = result.found;
    }

    if (!found) return state;

    const nextSections = [...state.document.sections];
    nextSections[activeSectionIndex] = nextSection;

    return {
      ...state,
      document: {
        ...state.document,
        sections: nextSections,
      },
      selection: withSelection(paragraphOffsetToPosition(table.rows[0]!.cells[0]!.blocks[0]!, 0)),
    };
  }

  // Fallback for document.blocks
  const result = insertIntoBlocks(state.document.blocks);
  if (!result.found) return state;

  return {
    ...state,
    document: {
      ...state.document,
      blocks: result.nextBlocks,
    },
    selection: withSelection(paragraphOffsetToPosition(table.rows[0]!.cells[0]!.blocks[0]!, 0)),
  };
}

export function insertPlainTextAtSelection(state: EditorState, text: string): EditorState {
  if (text.length === 0) {
    return state;
  }

  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalizedText.includes("\n")) {
    return insertTextAtSelection(state, normalizedText);
  }

  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const lines = normalizedText.split("\n");
  const insertionStyles = getStyleAtOffset(paragraph, offset);
  const beforeRuns = sliceRuns(paragraph, 0, offset);
  const firstParagraph = buildParagraphFromRuns(paragraph, [
    ...beforeRuns,
    createEditorStyledRun(lines[0], insertionStyles),
  ], insertionStyles);
  const tailRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  const middleParagraphs = lines
    .slice(1, -1)
    .map((line) => createParagraphFromRuns([{ text: line, styles: insertionStyles }]));
  const lastParagraph = createParagraphFromRuns([
    { text: lines[lines.length - 1], styles: insertionStyles },
    ...tailRuns.map((run) => ({ text: run.text, styles: run.styles })),
  ]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index)),
    firstParagraph,
    ...middleParagraphs,
    lastParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(lastParagraph, lines[lines.length - 1].length)),
  );
}

export function splitBlockAtSelection(state: EditorState): EditorState {
  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const firstParagraph = buildParagraphFromRuns(paragraph, sliceRuns(paragraph, 0, offset), getStyleAtOffset(paragraph, offset));
  const secondRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  const nextParagraph =
    secondRuns.length > 0
      ? createParagraphFromRuns(secondRuns.map((run) => ({ text: run.text, styles: run.styles })))
      : createEditorParagraph("");
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index)),
    firstParagraph,
    nextParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(nextParagraph, 0)),
  );
}

export function insertPageBreakAtSelection(state: EditorState): EditorState {
  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const firstParagraph = buildParagraphFromRuns(
    paragraph,
    sliceRuns(paragraph, 0, offset),
    getStyleAtOffset(paragraph, offset),
  );
  const secondRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  const nextParagraph =
    secondRuns.length > 0
      ? createParagraphFromRuns(secondRuns.map((run) => ({ text: run.text, styles: run.styles })))
      : createEditorParagraph("");

  nextParagraph.style = {
    ...(paragraph.style ?? {}),
    pageBreakBefore: true,
  };

  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index)),
    firstParagraph,
    nextParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(nextParagraph, 0)),
  );
}

export function insertSectionBreakAtSelection(
  state: EditorState,
  breakType: "nextPage" | "continuous",
): EditorState {
  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const sections = getDocumentSections(collapsedState.document);
  const activeSectionIndex = getActiveSectionIndex(collapsedState);
  const zone = getActiveZone(collapsedState);

  if (zone !== "main") {
    return state;
  }

  const section = sections[activeSectionIndex];
  if (!section) {
    return state;
  }

  // Split the current section blocks at the current paragraph
  const blockIndex = section.blocks.findIndex((block) => {
    if (block.type === "paragraph") {
      return block.id === paragraph.id;
    }
    return false; // For now, we only support splitting at paragraph level
  });

  if (blockIndex === -1) {
    return state;
  }

  const beforeBlocks = section.blocks.slice(0, blockIndex);
  const afterBlocks = section.blocks.slice(blockIndex + 1);

  // Split the paragraph itself
  const firstParagraph = buildParagraphFromRuns(
    paragraph,
    sliceRuns(paragraph, 0, offset),
    getStyleAtOffset(paragraph, offset),
  );
  const secondRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  const secondParagraph =
    secondRuns.length > 0
      ? createParagraphFromRuns(secondRuns.map((run) => ({ text: run.text, styles: run.styles })))
      : createEditorParagraph("");

  const newSectionId = `section:${Math.random().toString(36).slice(2, 9)}`;
  const newSection: EditorSection = {
    id: newSectionId,
    blocks: [secondParagraph, ...afterBlocks],
    pageSettings: { ...section.pageSettings },
    header: section.header ? cloneBlocks(section.header) : undefined,
    footer: section.footer ? cloneBlocks(section.footer) : undefined,
    breakType: breakType,
  };

  const updatedSection: EditorSection = {
    ...section,
    blocks: [...beforeBlocks, firstParagraph],
  };

  const nextSections = [
    ...sections.slice(0, activeSectionIndex),
    updatedSection,
    newSection,
    ...sections.slice(activeSectionIndex + 1),
  ];

  return {
    ...collapsedState,
    document: {
      ...collapsedState.document,
      sections: nextSections,
    },
    activeSectionIndex: activeSectionIndex + 1,
    selection: withSelection(paragraphOffsetToPosition(secondParagraph, 0)),
  };
}

export function updateSectionSettings(
  state: EditorState,
  sectionIndex: number,
  settings: Partial<EditorSection>,
): EditorState {
  const sections = getDocumentSections(state.document);
  if (sectionIndex < 0 || sectionIndex >= sections.length) {
    return state;
  }

  const nextSections = [...sections];
  nextSections[sectionIndex] = {
    ...nextSections[sectionIndex],
    ...settings,
    pageSettings: {
      ...nextSections[sectionIndex].pageSettings,
      ...(settings.pageSettings ?? {}),
      margins: {
        ...nextSections[sectionIndex].pageSettings.margins,
        ...(settings.pageSettings?.margins ?? {}),
      },
    },
  };

  return {
    ...state,
    document: {
      ...state.document,
      sections: nextSections,
    },
  };
}

export function insertFieldAtSelection(state: EditorState, fieldType: "PAGE" | "NUMPAGES"): EditorState {
  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  
  const beforeRuns = sliceRuns(paragraph, 0, offset);
  const afterRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  
  const fieldRun: EditorTextRun = {
    id: `run:field:${Math.random().toString(36).slice(2, 9)}`,
    text: fieldType === "PAGE" ? "1" : "1", // Placeholder, resolved during projection
    field: { type: fieldType },
    styles: getStyleAtOffset(paragraph, offset)
  };

  const nextParagraph = buildParagraphFromRuns(paragraph, [...beforeRuns, fieldRun, ...afterRuns]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index)),
    nextParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(nextParagraph, offset + fieldRun.text.length)),
  );
}

export function splitListItemAtSelection(state: EditorState): EditorState {
  const collapsedState = isSelectionCollapsed(state.selection) ? state : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const firstParagraph = buildParagraphFromRuns(
    paragraph,
    sliceRuns(paragraph, 0, offset),
    getStyleAtOffset(paragraph, offset),
  );
  const secondRuns = sliceRuns(paragraph, offset, getParagraphLength(paragraph));
  const nextParagraph =
    secondRuns.length > 0
      ? createParagraphFromRunsLike(
          paragraph,
          secondRuns.map((run) => ({ text: run.text, styles: run.styles })),
        )
      : (() => {
          const emptyParagraph = createEditorParagraph("");
          emptyParagraph.style = paragraph.style ? { ...paragraph.style } : undefined;
          emptyParagraph.list = cloneParagraphList(paragraph.list);
          return emptyParagraph;
        })();
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index)),
    firstParagraph,
    nextParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(nextParagraph, 0)),
  );
}

export function clearParagraphListAtSelection(state: EditorState): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraphIndex < normalized.startIndex || paragraphIndex > normalized.endIndex) {
      return cloneParagraph(paragraph);
    }

    return clearParagraphList(paragraph);
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function indentParagraphList(state: EditorState): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraphIndex < normalized.startIndex || paragraphIndex > normalized.endIndex) {
      return cloneParagraph(paragraph);
    }

    if (!paragraph.list) {
      return cloneParagraph(paragraph);
    }

    return cloneParagraphWithListLevel(paragraph, (paragraph.list.level ?? 0) + 1);
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function outdentParagraphList(state: EditorState): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraphIndex < normalized.startIndex || paragraphIndex > normalized.endIndex) {
      return cloneParagraph(paragraph);
    }

    if (!paragraph.list) {
      return cloneParagraph(paragraph);
    }

    const currentLevel = paragraph.list.level ?? 0;
    if (currentLevel <= 0) {
      return clearParagraphList(paragraph);
    }

    return cloneParagraphWithListLevel(paragraph, currentLevel - 1);
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function deleteBackward(state: EditorState): EditorState {
  if (!isSelectionCollapsed(state.selection)) {
    return deleteSelectionRange(state);
  }

  const { paragraph, index, offset } = getFocusParagraph(state);
  const paragraphs = getParagraphs(state);

  if (offset > 0) {
    if (state.trackChangesEnabled) {
      const runs = paragraph.runs;
      let consumed = 0;
      let targetRunIndex = -1;
      let runOffset = -1;
      for (let i = 0; i < runs.length; i += 1) {
        const nextConsumed = consumed + runs[i].text.length;
        if (offset <= nextConsumed) {
          targetRunIndex = i;
          runOffset = offset - consumed;
          break;
        }
        consumed = nextConsumed;
      }

      if (targetRunIndex !== -1) {
        const targetRun = runs[targetRunIndex];
        // If we are deleting an "insert" revision, just remove the character
        if (targetRun.revision?.type === "insert") {
          const nextRuns = [
            ...sliceRuns(paragraph, 0, offset - 1),
            ...sliceRuns(paragraph, offset, getParagraphLength(paragraph)),
          ];
          const nextParagraph = buildParagraphFromRuns(paragraph, nextRuns);
          const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
            candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
          );
          return cloneStateWithParagraphs(
            state,
            nextParagraphs,
            withSelection(paragraphOffsetToPosition(nextParagraph, offset - 1)),
          );
        }

        // Otherwise, split and mark as "delete"
        const charToDelete = targetRun.text[runOffset - 1];
        const deletionRun: EditorTextRun = {
          id: `run:${Math.random().toString(36).slice(2, 9)}`,
          text: charToDelete,
          styles: { ...targetRun.styles },
          revision: {
            id: `rev:${Math.random().toString(36).slice(2, 9)}`,
            type: "delete",
            author: "User",
            date: Date.now(),
          },
        };

        const nextRuns = [
          ...sliceRuns(paragraph, 0, offset - 1),
          deletionRun,
          ...sliceRuns(paragraph, offset, getParagraphLength(paragraph)),
        ];
        const nextParagraph = buildParagraphFromRuns(paragraph, nextRuns);
        const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
          candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
        );
        return cloneStateWithParagraphs(
          state,
          nextParagraphs,
          withSelection(paragraphOffsetToPosition(nextParagraph, offset - 1)),
        );
      }
    }

    const nextParagraph = buildParagraphFromRuns(
      paragraph,
      [
        ...sliceRuns(paragraph, 0, offset - 1),
        ...sliceRuns(paragraph, offset, getParagraphLength(paragraph)),
      ],
      getStyleAtOffset(paragraph, offset - 1),
    );
    const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
      candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
    );

    return cloneStateWithParagraphs(
      state,
      nextParagraphs,
      withSelection(paragraphOffsetToPosition(nextParagraph, offset - 1)),
    );
  }

  if (index === 0) {
    return state;
  }

  const previousParagraph = paragraphs[index - 1];
  const mergedParagraph = buildParagraphFromRuns(previousParagraph, [
    ...previousParagraph.runs.map(cloneRun),
    ...paragraph.runs.map(cloneRun),
  ]);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index - 1)),
    mergedParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(mergedParagraph, getParagraphLength(previousParagraph))),
  );
}

export function deleteForward(state: EditorState): EditorState {
  if (!isSelectionCollapsed(state.selection)) {
    return deleteSelectionRange(state);
  }

  const { paragraph, index, offset } = getFocusParagraph(state);
  const paragraphs = getParagraphs(state);

  if (offset < getParagraphLength(paragraph)) {
    if (state.trackChangesEnabled) {
      const runs = paragraph.runs;
      let consumed = 0;
      let targetRunIndex = -1;
      let runOffset = -1;
      for (let i = 0; i < runs.length; i += 1) {
        const nextConsumed = consumed + runs[i].text.length;
        if (offset < nextConsumed) {
          targetRunIndex = i;
          runOffset = offset - consumed;
          break;
        }
        consumed = nextConsumed;
      }

      if (targetRunIndex !== -1) {
        const targetRun = runs[targetRunIndex];
        // If we are deleting an "insert" revision, just remove the character
        if (targetRun.revision?.type === "insert") {
          const nextRuns = [
            ...sliceRuns(paragraph, 0, offset),
            ...sliceRuns(paragraph, offset + 1, getParagraphLength(paragraph)),
          ];
          const nextParagraph = buildParagraphFromRuns(paragraph, nextRuns);
          const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
            candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
          );
          return cloneStateWithParagraphs(
            state,
            nextParagraphs,
            withSelection(paragraphOffsetToPosition(nextParagraph, offset)),
          );
        }

        // Otherwise, split and mark as "delete"
        const charToDelete = targetRun.text[runOffset];
        const deletionRun: EditorTextRun = {
          id: `run:${Math.random().toString(36).slice(2, 9)}`,
          text: charToDelete,
          styles: { ...targetRun.styles },
          revision: {
            id: `rev:${Math.random().toString(36).slice(2, 9)}`,
            type: "delete",
            author: "User",
            date: Date.now(),
          },
        };

        const nextRuns = [
          ...sliceRuns(paragraph, 0, offset),
          deletionRun,
          ...sliceRuns(paragraph, offset + 1, getParagraphLength(paragraph)),
        ];
        const nextParagraph = buildParagraphFromRuns(paragraph, nextRuns);
        const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
          candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
        );
        return cloneStateWithParagraphs(
          state,
          nextParagraphs,
          withSelection(paragraphOffsetToPosition(nextParagraph, offset)),
        );
      }
    }

    const nextParagraph = buildParagraphFromRuns(
      paragraph,
      [
        ...sliceRuns(paragraph, 0, offset),
        ...sliceRuns(paragraph, offset + 1, getParagraphLength(paragraph)),
      ],
      getStyleAtOffset(paragraph, offset),
    );
    const nextParagraphs = paragraphs.map((candidate, candidateIndex) =>
      candidateIndex === index ? nextParagraph : cloneParagraph(candidate),
    );

    return cloneStateWithParagraphs(
      state,
      nextParagraphs,
      withSelection(paragraphOffsetToPosition(nextParagraph, offset)),
    );
  }

  if (index >= paragraphs.length - 1) {
    return state;
  }

  const nextParagraph = paragraphs[index + 1];
  const mergedParagraph = buildParagraphFromRuns(paragraph, [
    ...paragraph.runs.map(cloneRun),
    ...nextParagraph.runs.map(cloneRun),
  ]);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index)),
    mergedParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 2)),
  ];

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    withSelection(paragraphOffsetToPosition(mergedParagraph, offset)),
  );
}

export function moveSelectionLeft(state: EditorState): EditorState {
  if (!isSelectionCollapsed(state.selection)) {
    return collapseToBoundary(state, "start");
  }

  const { paragraph, index, offset } = getFocusParagraph(state);
  const paragraphs = getParagraphs(state);
  if (offset > 0) {
    return {
      document: state.document,
      selection: withSelection(paragraphOffsetToPosition(paragraph, offset - 1)),
    };
  }

  if (index === 0) {
    return state;
  }

  const previousParagraph = paragraphs[index - 1];
  return {
    document: state.document,
    selection: withSelection(paragraphOffsetToPosition(previousParagraph, getParagraphLength(previousParagraph))),
  };
}

export function moveSelectionRight(state: EditorState): EditorState {
  if (!isSelectionCollapsed(state.selection)) {
    return collapseToBoundary(state, "end");
  }

  const { paragraph, index, offset } = getFocusParagraph(state);
  const paragraphs = getParagraphs(state);
  const paragraphLength = getParagraphLength(paragraph);
  if (offset < paragraphLength) {
    return {
      document: state.document,
      selection: withSelection(paragraphOffsetToPosition(paragraph, offset + 1)),
    };
  }

  if (index >= paragraphs.length - 1) {
    return state;
  }

  const nextParagraph = paragraphs[index + 1];
  return {
    document: state.document,
    selection: withSelection(paragraphOffsetToPosition(nextParagraph, 0)),
  };
}

function moveVertical(state: EditorState, delta: -1 | 1): EditorState {
  if (!isSelectionCollapsed(state.selection)) {
    return collapseToBoundary(state, delta < 0 ? "start" : "end");
  }

  const { index, offset } = getFocusParagraph(state);
  const paragraphs = getParagraphs(state);
  const nextIndex = index + delta;

  if (nextIndex < 0 || nextIndex >= paragraphs.length) {
    return state;
  }

  const nextParagraph = paragraphs[nextIndex];
  return {
    document: state.document,
    selection: withSelection(
      paragraphOffsetToPosition(nextParagraph, Math.min(offset, getParagraphLength(nextParagraph))),
    ),
  };
}

export function moveSelectionUp(state: EditorState): EditorState {
  return moveVertical(state, -1);
}

export function moveSelectionDown(state: EditorState): EditorState {
  return moveVertical(state, 1);
}

function moveFocusHorizontally(state: EditorState, delta: -1 | 1): EditorState {
  const focus = clampPosition(state, state.selection.focus);
  const paragraphs = getParagraphs(state);
  const index = findParagraphIndex(paragraphs, focus.paragraphId);
  const paragraph = paragraphs[index];
  const paragraphOffset = positionToParagraphOffset(paragraph, focus);
  const paragraphLength = getParagraphLength(paragraph);

  if (delta < 0 && paragraphOffset > 0) {
    return setSelection(state, {
      anchor: state.selection.anchor,
      focus: paragraphOffsetToPosition(paragraph, paragraphOffset - 1),
    });
  }

  if (delta > 0 && paragraphOffset < paragraphLength) {
    return setSelection(state, {
      anchor: state.selection.anchor,
      focus: paragraphOffsetToPosition(paragraph, paragraphOffset + 1),
    });
  }

  if (delta < 0 && index > 0) {
    const previousParagraph = paragraphs[index - 1];
    return setSelection(state, {
      anchor: state.selection.anchor,
      focus: paragraphOffsetToPosition(previousParagraph, getParagraphLength(previousParagraph)),
    });
  }

  if (delta > 0 && index < paragraphs.length - 1) {
    const nextParagraph = paragraphs[index + 1];
    return setSelection(state, {
      anchor: state.selection.anchor,
      focus: paragraphOffsetToPosition(nextParagraph, 0),
    });
  }

  return state;
}

function moveFocusVertical(state: EditorState, delta: -1 | 1): EditorState {
  const focus = clampPosition(state, state.selection.focus);
  const paragraphs = getParagraphs(state);
  const index = findParagraphIndex(paragraphs, focus.paragraphId);
  const paragraph = paragraphs[index];
  const paragraphOffset = positionToParagraphOffset(paragraph, focus);
  const nextIndex = index + delta;

  if (nextIndex < 0 || nextIndex >= paragraphs.length) {
    return state;
  }

  const nextParagraph = paragraphs[nextIndex];
  return setSelection(state, {
    anchor: state.selection.anchor,
    focus: paragraphOffsetToPosition(nextParagraph, Math.min(paragraphOffset, getParagraphLength(nextParagraph))),
  });
}

export function extendSelectionLeft(state: EditorState): EditorState {
  return moveFocusHorizontally(state, -1);
}

export function extendSelectionRight(state: EditorState): EditorState {
  return moveFocusHorizontally(state, 1);
}

export function extendSelectionUp(state: EditorState): EditorState {
  return moveFocusVertical(state, -1);
}

export function extendSelectionDown(state: EditorState): EditorState {
  return moveFocusVertical(state, 1);
}

export function toggleTextStyle(
  state: EditorState,
  key: ToggleableTextStyleKey,
): EditorState {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const touchedParagraphs = paragraphs
    .slice(normalized.startIndex, normalized.endIndex + 1);
    const touchedParagraphIds = touchedParagraphs.map(p => p.id).join(",");
  // eslint-disable-next-line no-console
  console.log(`[toggleTextStyle:${key}] paragraphs[${normalized.startIndex}..${normalized.endIndex}]: ${touchedParagraphIds}`);

  const touchedRuns = touchedParagraphs
    .flatMap((paragraph, relativeIndex) => {
      const paragraphIndex = normalized.startIndex + relativeIndex;
      const startOffset = paragraphIndex === normalized.startIndex ? normalized.startParagraphOffset : 0;
      const endOffset =
        paragraphIndex === normalized.endIndex
          ? normalized.endParagraphOffset
          : getParagraphLength(paragraph);
      return sliceRuns(paragraph, startOffset, endOffset);
    })
    .filter((run) => run.text.length > 0);

  if (touchedRuns.length === 0) {
    return state;
  }

  const shouldEnable = !touchedRuns.every((run) => Boolean(run.styles?.[key]));
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraphIndex < normalized.startIndex || paragraphIndex > normalized.endIndex) {
      return cloneParagraph(paragraph);
    }

    const startOffset = paragraphIndex === normalized.startIndex ? normalized.startParagraphOffset : 0;
    const endOffset =
      paragraphIndex === normalized.endIndex
        ? normalized.endParagraphOffset
        : getParagraphLength(paragraph);

    return mapRunsInRange(paragraph, startOffset, endOffset, (run) => ({
      ...run,
      styles: setBooleanStyle(run.styles, key, shouldEnable),
    }));
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function setTextStyleValue<K extends ValueTextStyleKey>(
  state: EditorState,
  key: K,
  value: EditorTextStyle[K] | null,
): EditorState {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  const paragraphs = getParagraphs(state);
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraphIndex < normalized.startIndex || paragraphIndex > normalized.endIndex) {
      return cloneParagraph(paragraph);
    }

    const startOffset = paragraphIndex === normalized.startIndex ? normalized.startParagraphOffset : 0;
    const endOffset =
      paragraphIndex === normalized.endIndex
        ? normalized.endParagraphOffset
        : getParagraphLength(paragraph);

    return mapRunsInRange(paragraph, startOffset, endOffset, (run) => ({
      ...run,
      styles: setValueStyle(run.styles, key, value),
    }));
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function getLinkAtSelection(state: EditorState): string | null {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);

  if (normalized.isCollapsed) {
    const paragraph = paragraphs[normalized.startIndex];
    if (!paragraph) {
      return null;
    }
    return expandLinkRangeInParagraph(paragraph, normalized.startParagraphOffset)?.href ?? null;
  }

  const touchedRuns = paragraphs
    .slice(normalized.startIndex, normalized.endIndex + 1)
    .flatMap((paragraph, relativeIndex) => {
      const paragraphIndex = normalized.startIndex + relativeIndex;
      const startOffset = paragraphIndex === normalized.startIndex ? normalized.startParagraphOffset : 0;
      const endOffset =
        paragraphIndex === normalized.endIndex
          ? normalized.endParagraphOffset
          : getParagraphLength(paragraph);
      return sliceRuns(paragraph, startOffset, endOffset);
    })
    .filter((run) => run.text.length > 0 && !run.image);

  if (touchedRuns.length === 0) {
    return null;
  }

  const href = touchedRuns[0]?.styles?.link;
  if (!href) {
    return null;
  }

  return touchedRuns.every((run) => run.styles?.link === href) ? href : null;
}

export function setLinkAtSelection(
  state: EditorState,
  href: string | null,
): EditorState {
  const normalized = normalizeSelection(state);
  if (!normalized.isCollapsed) {
    return setTextStyleValue(state, "link", href);
  }

  const paragraphs = getParagraphs(state);
  const paragraph = paragraphs[normalized.startIndex];
  if (!paragraph) {
    return state;
  }

  const linkRange = expandLinkRangeInParagraph(paragraph, normalized.startParagraphOffset);
  if (!linkRange) {
    return state;
  }

  const expandedSelection = {
    anchor: paragraphOffsetToPosition(paragraph, linkRange.startOffset),
    focus: paragraphOffsetToPosition(paragraph, linkRange.endOffset),
  };

  const expandedState = setSelection(state, expandedSelection);
  const next = setTextStyleValue(expandedState, "link", href);
  const nextParagraph = getParagraphs(next)[normalized.startIndex];
  if (!nextParagraph) {
    return next;
  }

  return {
    ...next,
    selection: {
      anchor: paragraphOffsetToPosition(nextParagraph, linkRange.startOffset),
      focus: paragraphOffsetToPosition(nextParagraph, linkRange.endOffset),
    },
  };
}

export function setParagraphNamedStyle(state: EditorState, styleId: string | null): EditorState {
  return setParagraphStyle(state, "styleId", styleId);
}

export function setParagraphStyle<K extends ValueParagraphStyleKey>(
  state: EditorState,
  key: K,
  value: EditorParagraphStyle[K] | null,
): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const startIndex = normalized.startIndex;
  const endIndex = normalized.endIndex;

  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraphIndex < startIndex || paragraphIndex > endIndex) {
      return cloneParagraph(paragraph);
    }

    return {
      ...cloneParagraph(paragraph),
      style: setParagraphStyleValue(paragraph.style, key, value),
    };
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function toggleParagraphList(
  state: EditorState,
  kind: ParagraphListKind,
): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  const startIndex = normalized.startIndex;
  const endIndex = normalized.endIndex;
  const targetedParagraphs = paragraphs.slice(startIndex, endIndex + 1);
  const shouldClear =
    targetedParagraphs.length > 0 &&
    targetedParagraphs.every((paragraph) => paragraph.list?.kind === kind);

  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraphIndex < startIndex || paragraphIndex > endIndex) {
      return cloneParagraph(paragraph);
    }

    const nextParagraph = cloneParagraph(paragraph);
    if (shouldClear) {
      delete nextParagraph.list;
      return nextParagraph;
    }

    nextParagraph.list = {
      kind,
      level: paragraph.list?.level ?? 0,
      format: paragraph.list?.format,
      startAt: paragraph.list?.startAt,
    };
    return nextParagraph;
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function setParagraphListFormat(
  state: EditorState,
  format: EditorParagraphListStyle["format"] | null,
): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);
  
  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraphIndex < normalized.startIndex || paragraphIndex > normalized.endIndex) {
      return cloneParagraph(paragraph);
    }

    if (!paragraph.list) {
      return cloneParagraph(paragraph);
    }

    return {
      ...cloneParagraph(paragraph),
      list: {
        ...paragraph.list,
        format: format || undefined,
      },
    };
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function setParagraphListStartAt(
  state: EditorState,
  startAt: number | null,
): EditorState {
  const normalized = normalizeSelection(state);
  const paragraphs = getParagraphs(state);

  const nextParagraphs = paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraphIndex < normalized.startIndex || paragraphIndex > normalized.endIndex) {
      return cloneParagraph(paragraph);
    }

    if (!paragraph.list) {
      return cloneParagraph(paragraph);
    }

    return {
      ...cloneParagraph(paragraph),
      list: {
        ...paragraph.list,
        startAt: startAt !== null ? startAt : undefined,
      },
    };
  });

  return cloneStateWithParagraphs(
    state,
    nextParagraphs,
    preserveSelectionByParagraphOffsets(nextParagraphs, normalized),
  );
}

export function setParagraphTabStops(
  state: EditorState,
  tabs: EditorTabStop[] | null,
): EditorState {
  return setParagraphStyle(state, "tabs", tabs);
}

