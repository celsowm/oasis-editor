import type { EditorParagraphStyle } from "../model.js";

export function parseParagraphStyle(
  element: Element,
): EditorParagraphStyle | undefined {
  const style = (element as HTMLElement).style;
  const result: EditorParagraphStyle = {};

  const align = style.textAlign.trim();
  if (
    align === "left" ||
    align === "center" ||
    align === "right" ||
    align === "justify"
  ) {
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

  if (
    style.breakBefore === "page" ||
    (element as HTMLElement).dataset.oasisPageBreakBefore === "true"
  ) {
    result.pageBreakBefore = true;
  }

  if ((element as HTMLElement).dataset.oasisKeepWithNext === "true") {
    result.keepWithNext = true;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
