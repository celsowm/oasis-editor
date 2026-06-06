import type {
  EditorNamedStyle,
  EditorParagraphNode,
} from "../../core/model.js";
import { resolveEffectiveParagraphStyle } from "../../core/model.js";

const DEFAULT_LIST_GUTTER = 24;
// Extra horizontal indent added per nested list level, matching the
// 0.25 inch "Define New Multilevel List" default step Word applies for the
// built-in numbering gallery.
const LIST_LEVEL_INDENT_STEP = 24;

export function getListIndentPx(paragraph: EditorParagraphNode): number {
  if (!paragraph.list) return 0;
  const level = paragraph.list.level ?? 0;
  return DEFAULT_LIST_GUTTER + level * LIST_LEVEL_INDENT_STEP;
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
  const listGutter = getListIndentPx(paragraph);

  // indentLeft specifies the start edge for all lines.
  const baseInset = (paragraphStyle.indentLeft ?? 0) + listGutter;

  // If first line, we add indentFirstLine. If indentHanging is present, it acts as a negative indentFirstLine.
  const firstLineOffset = paragraphStyle.indentHanging
    ? -Math.abs(paragraphStyle.indentHanging)
    : (paragraphStyle.indentFirstLine ?? 0);

  const startInset = baseInset + (isFirstLine ? firstLineOffset : 0);
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
  const listGutter = getListIndentPx(paragraph);

  const baseInset = (paragraphStyle.indentLeft ?? 0) + listGutter;
  const firstLineOffset = paragraphStyle.indentHanging
    ? -Math.abs(paragraphStyle.indentHanging)
    : (paragraphStyle.indentFirstLine ?? 0);

  return baseInset + (isFirstLine ? firstLineOffset : 0);
}
