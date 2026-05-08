import type { EditorBlockNode, EditorDocument, EditorParagraphListStyle, EditorParagraphStyle, EditorParagraphNode, EditorPosition, EditorSelection, EditorState, EditorTextRun, EditorTextStyle, EditorImageRunData, EditorSection, EditorTableCellNode } from "../model.js";
import { getParagraphLength, getParagraphs, paragraphOffsetToPosition, positionToParagraphOffset, getActiveSectionIndex, getActiveZone, resolveImageSrc } from "../model.js";
import { createEditorDocument, createEditorParagraphFromRuns, createEditorStyledRun } from "../editorState.js";
import { clampPosition, createCollapsedSelection, findParagraphIndex, isSelectionCollapsed, normalizeSelection } from "../selection.js";
import { deleteBackward } from "./text.js";
import { setSelection } from "./selection.js";

export type ToggleableTextStyleKey =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "superscript"
  | "subscript";

export type ValueTextStyleKey = "fontFamily" | "fontSize" | "color" | "highlight" | "link";

export type ValueParagraphStyleKey =
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

export type ParagraphListKind = EditorParagraphListStyle["kind"];

export function cloneStyle(style?: EditorTextStyle): EditorTextStyle | undefined {
  return style ? { ...style } : undefined;
}

export function stylesEqual(left?: EditorTextStyle, right?: EditorTextStyle): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

export function setBooleanStyle(
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

export function setValueStyle<K extends ValueTextStyleKey>(
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

export function cloneRun(run: EditorTextRun): EditorTextRun {
  return {
    ...run,
    styles: cloneStyle(run.styles),
  };
}

export function cloneParagraph(paragraph: EditorParagraphNode): EditorParagraphNode {
  return {
    ...paragraph,
    runs: paragraph.runs.map(cloneRun),
    style: paragraph.style ? { ...paragraph.style } : undefined,
    list: paragraph.list ? { ...paragraph.list } : undefined,
  };
}

export function cloneParagraphList(
  list?: EditorParagraphListStyle,
): EditorParagraphListStyle | undefined {
  return list ? { ...list } : undefined;
}

export function setParagraphStyleValue<K extends ValueParagraphStyleKey>(
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

export function cloneParagraphs(paragraphs: EditorParagraphNode[]): EditorParagraphNode[] {
  return paragraphs.map(cloneParagraph);
}

export function cloneBlocks(blocks: EditorBlockNode[]): EditorBlockNode[] {
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

export function normalizeRuns(runs: EditorTextRun[], fallbackStyles?: EditorTextStyle): EditorTextRun[] {
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

export function buildParagraphFromRuns(
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

export function createParagraphFromRuns(
  textRuns: Array<{ text: string; styles?: EditorTextStyle }>,
): EditorParagraphNode {
  return createEditorParagraphFromRuns(textRuns);
}

export function createParagraphFromRunsLike(
  paragraph: EditorParagraphNode,
  textRuns: Array<{ text: string; styles?: EditorTextStyle }>,
): EditorParagraphNode {
  const nextParagraph = createParagraphFromRuns(textRuns);
  nextParagraph.style = paragraph.style ? { ...paragraph.style } : undefined;
  nextParagraph.list = cloneParagraphList(paragraph.list);
  return nextParagraph;
}

export function cloneParagraphWithListLevel(
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

export function clearParagraphList(paragraph: EditorParagraphNode): EditorParagraphNode {
  const nextParagraph = cloneParagraph(paragraph);
  delete nextParagraph.list;
  return nextParagraph;
}

export function blocksContainTables(nodes: EditorBlockNode[]): boolean {
  for (const node of nodes) {
    if (node.type === "table") {
      return true;
    }
  }
  return false;
}

export function replaceParagraphsInBlocks(blocks: EditorBlockNode[], newParagraphs: EditorParagraphNode[]): EditorBlockNode[] {
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

export function replaceParagraphsInSection(
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

export function cloneStateWithParagraphs(
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

  // Preserve every existing field on the document (id, styles, assets,
  // metadata, sections, pageSettings, …) and only swap the paragraph
  // blocks. The previous implementation called `createEditorDocument`,
  // which minted a fresh document and silently dropped fields it didn't
  // know about — most importantly the `assets` registry, causing image
  // runs to dangle on `asset:<id>` references that no longer resolved.
  return {
    ...state,
    document: {
      ...state.document,
      blocks: paragraphs,
    },
    selection,
  };
}

export function withSelection(position: EditorPosition): EditorSelection {
  return createCollapsedSelection(position);
}

export function getFocusParagraph(state: EditorState): {
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

export function getStyleAtOffset(paragraph: EditorParagraphNode, offset: number): EditorTextStyle | undefined {
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

export function getRunAtOffset(
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

export function expandLinkRangeInParagraph(
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

export function sliceRuns(
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

export function insertRunsAtOffset(
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

export function deleteSelectionRange(state: EditorState): EditorState {
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

export function mapRunsInRange(
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

export function preserveSelectionByParagraphOffsets(
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

export function collapseToBoundary(state: EditorState, direction: "start" | "end"): EditorState {
  const normalized = normalizeSelection(state);
  if (normalized.isCollapsed) {
    return state;
  }

  return {
    document: state.document,
    selection: withSelection(direction === "start" ? normalized.start : normalized.end),
  };
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function textRunStylesToCss(style?: EditorTextStyle): string {
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

export function paragraphStyleToCssText(style?: EditorParagraphStyle): string {
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

export function serializeImageRunToHtml(
  run: EditorTextRun,
  document?: Pick<EditorDocument, "assets">,
): string {
  if (!run.image) {
    return "";
  }

  // Asset references must be expanded to the actual data URL so the
  // copied HTML is portable (clipboard consumers don't see our registry).
  const resolvedSrc = resolveImageSrc(document, run.image.src);
  const altAttr = run.image.alt !== undefined ? ` alt="${escapeHtml(run.image.alt)}"` : "";
  const img = `<img src="${escapeHtml(resolvedSrc)}" width="${Math.max(1, Math.round(run.image.width))}" height="${Math.max(1, Math.round(run.image.height))}"${altAttr}>`;
  if (run.styles?.link) {
    return `<a href="${escapeHtml(run.styles.link)}">${img}</a>`;
  }

  return img;
}

export function serializeTextRunToHtml(
  run: EditorTextRun,
  document?: Pick<EditorDocument, "assets">,
): string {
  if (run.image) {
    return serializeImageRunToHtml(run, document);
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

export function serializeParagraphRunsToHtml(
  runs: EditorTextRun[],
  document?: Pick<EditorDocument, "assets">,
): string {
  return runs.map((run) => serializeTextRunToHtml(run, document)).join("") || "<br>";
}

export function parseInlineStyles(element: Element): EditorTextStyle | undefined {
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

export function parseInlineImage(element: Element): EditorImageRunData | undefined {
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

export function parseParagraphStyle(element: Element): EditorParagraphStyle | undefined {
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

export function updateTableCellsInBlocks(
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

export function moveVertical(state: EditorState, delta: -1 | 1): EditorState {
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

export function moveFocusHorizontally(state: EditorState, delta: -1 | 1): EditorState {
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

export function moveFocusVertical(state: EditorState, delta: -1 | 1): EditorState {
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
