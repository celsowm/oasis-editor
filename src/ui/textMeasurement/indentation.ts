import type {
  EditorNamedStyle,
  EditorParagraphNode,
  EditorParagraphStyle,
} from "@/core/model.js";
import { resolveEffectiveParagraphStyle } from "@/core/model.js";
import { PX_PER_POINT } from "./constants.js";

const DEFAULT_LIST_GUTTER = 24;
// Extra horizontal indent added per nested list level, matching the
// 0.25 inch "Define New Multilevel List" default step Word applies for the
// built-in numbering gallery.
const LIST_LEVEL_INDENT_STEP = 24;

/**
 * Horizontal gutter reserved for a list label. When the paragraph (via its
 * numbering definition or style) already carries an explicit left indent, that
 * indent positions the text and provides the label's hanging room, so the
 * default fallback gutter would double-indent — in that case we add nothing.
 */
function resolveListGutterPx(
  paragraph: EditorParagraphNode,
  paragraphStyle: EditorParagraphStyle,
): number {
  if (!paragraph.list) return 0;
  const level = paragraph.list.level ?? 0;
  if ((paragraphStyle.indentLeft ?? 0) > 0) {
    return 0;
  }
  return DEFAULT_LIST_GUTTER + level * LIST_LEVEL_INDENT_STEP;
}

export function getListIndentPx(paragraph: EditorParagraphNode): number {
  if (!paragraph.list) return 0;
  const level = paragraph.list.level ?? 0;
  return DEFAULT_LIST_GUTTER + level * LIST_LEVEL_INDENT_STEP;
}

/**
 * First-line text start for a list paragraph. The label occupies the hanging
 * area; the text begins at the text indent (`baseInset`) and, when the
 * numbering suffix is a tab (OOXML default), advances to the first explicit tab
 * stop that lies beyond the label's start.
 */
function getListTextFirstLineInset(
  paragraph: EditorParagraphNode,
  paragraphStyle: EditorParagraphStyle,
  baseInset: number,
): number {
  const numberStart = baseInset - Math.abs(paragraphStyle.indentHanging ?? 0);
  const suffix = paragraph.list?.suffix ?? "tab";
  if (suffix !== "tab") {
    return baseInset;
  }
  const nextTabStop = (paragraphStyle.tabs ?? [])
    .filter((tab): boolean => tab.type !== "clear" && Number.isFinite(tab.position))
    .map((tab): number => tab.position * PX_PER_POINT)
    .filter((positionPx): boolean => positionPx > numberStart + 0.01)
    .sort((a, b): number => a - b)[0];
  return nextTabStop !== undefined
    ? Math.max(baseInset, nextTabStop)
    : baseInset;
}

/**
 * Inset where a list label (bullet/number) is painted: the start of the hanging
 * area, i.e. the text indent minus the hanging amount. Used by the canvas and
 * PDF painters so the label sits to the left of the (possibly tab-advanced)
 * first-line text.
 */
export function getListLabelInset(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
): number {
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    styles,
  );
  const baseInset =
    (paragraphStyle.indentLeft ?? 0) +
    resolveListGutterPx(paragraph, paragraphStyle);
  return baseInset - Math.abs(paragraphStyle.indentHanging ?? 0);
}

/** Positions a measured list label inside the hanging-indent marker box. */
export function getAlignedListLabelInset(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
  textStart: number,
  labelWidth: number,
): number {
  const start = Math.max(0, getListLabelInset(paragraph, styles));
  const width = Math.max(0, textStart - start);
  switch (paragraph.list?.alignment) {
    case "center":
      return start + Math.max(0, (width - labelWidth) / 2);
    case "right":
      return start + Math.max(0, width - labelWidth);
    default:
      return start;
  }
}

export function getAvailableWidth(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
  contentWidth: number,
  isFirstLine: boolean,
): number {
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    styles,
  );
  const startInset = getLineStartInset(paragraph, styles, isFirstLine);
  const rightInset = paragraphStyle.indentRight ?? 0;
  return Math.max(1, contentWidth - rightInset - startInset);
}

export function getLineStartInset(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
  isFirstLine: boolean,
): number {
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    styles,
  );
  const baseInset =
    (paragraphStyle.indentLeft ?? 0) +
    resolveListGutterPx(paragraph, paragraphStyle);

  if (!isFirstLine) {
    return baseInset;
  }

  // List first lines keep the text at the text indent (the label fills the
  // hanging area); only the suffix tab can push the text further right.
  if (paragraph.list) {
    return getListTextFirstLineInset(paragraph, paragraphStyle, baseInset);
  }

  // Non-list paragraphs: hanging acts as a negative first-line indent.
  const firstLineOffset = paragraphStyle.indentHanging
    ? -Math.abs(paragraphStyle.indentHanging)
    : (paragraphStyle.indentFirstLine ?? 0);
  return baseInset + firstLineOffset;
}
