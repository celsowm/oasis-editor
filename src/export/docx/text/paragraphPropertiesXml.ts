import type {
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorTabStop,
  EditorNamedStyle,
} from "../../../core/model.js";
import { normalizeDocxColor, pointsToTwips, toTwips } from "../xmlUtils.js";
import { serializeParagraphBorders } from "../borders.js";
import { materializeParagraphStyle } from "./styleMaterialization.js";

function serializeParagraphTabs(
  tabs: EditorTabStop[] | null | undefined,
): string {
  if (!tabs || tabs.length === 0) {
    return "";
  }

  const parts = tabs
    .map((tab) => {
      const position = pointsToTwips(tab.position);
      if (position === null) {
        return "";
      }
      const attrs = [`w:val="${tab.type}"`, `w:pos="${position}"`];
      if (tab.leader && tab.leader !== "none") {
        attrs.push(`w:leader="${tab.leader}"`);
      } else if (tab.leader === "none") {
        attrs.push('w:leader="none"');
      }
      return `<w:tab ${attrs.join(" ")}/>`;
    })
    .filter(Boolean);

  return parts.length > 0 ? `<w:tabs>${parts.join("")}</w:tabs>` : "";
}

export function serializeParagraphProperties(
  paragraph: EditorParagraphNode,
  numberingInfo: Map<string, { numId: number; level: number }>,
  styles?: Record<string, EditorNamedStyle>,
  overrides?: { align?: EditorParagraphStyle["align"] },
): string {
  const parts: string[] = [];
  const style = materializeParagraphStyle(paragraph, styles);
  const align = paragraph.style?.align ?? overrides?.align ?? style.align;

  if (align) {
    parts.push(`<w:jc w:val="${align}"/>`);
  }

  if (
    style.spacingBefore !== undefined ||
    style.spacingAfter !== undefined ||
    style.lineHeight !== undefined
  ) {
    const attrs: string[] = [];
    const before = toTwips(style.spacingBefore);
    const after = toTwips(style.spacingAfter);
    const line =
      style.lineHeight !== undefined &&
      style.lineHeight !== null &&
      Number.isFinite(style.lineHeight)
        ? Math.round(style.lineHeight * 240)
        : null;
    if (before !== null) attrs.push(`w:before="${before}"`);
    if (after !== null) attrs.push(`w:after="${after}"`);
    if (line !== null) attrs.push(`w:line="${line}"`);
    if (attrs.length > 0) parts.push(`<w:spacing ${attrs.join(" ")}/>`);
  }

  if (
    style.indentLeft !== undefined ||
    style.indentRight !== undefined ||
    style.indentFirstLine !== undefined ||
    style.indentHanging !== undefined
  ) {
    const attrs: string[] = [];
    const left = toTwips(style.indentLeft);
    const right = toTwips(style.indentRight);
    const firstLine = toTwips(style.indentFirstLine);
    const hanging = toTwips(style.indentHanging);
    if (left !== null) attrs.push(`w:left="${left}"`);
    if (right !== null) attrs.push(`w:right="${right}"`);
    if (firstLine !== null) attrs.push(`w:firstLine="${firstLine}"`);
    if (hanging !== null) attrs.push(`w:hanging="${hanging}"`);
    if (attrs.length > 0) parts.push(`<w:ind ${attrs.join(" ")}/>`);
  }

  const tabs = serializeParagraphTabs(style.tabs);
  if (tabs) {
    parts.push(tabs);
  }

  if (style.pageBreakBefore) parts.push("<w:pageBreakBefore/>");
  if (style.keepWithNext) parts.push("<w:keepNext/>");
  if (style.keepLinesTogether) parts.push("<w:keepLines/>");
  if (style.widowControl === false) parts.push('<w:widowControl w:val="0"/>');
  if (style.contextualSpacing) parts.push("<w:contextualSpacing/>");

  const paragraphBorders = serializeParagraphBorders(style);
  if (paragraphBorders) {
    parts.push(paragraphBorders);
  }
  if (style.shading) {
    parts.push(
      `<w:shd w:val="clear" w:color="auto" w:fill="${normalizeDocxColor(style.shading, "FFFFFF")}"/>`,
    );
  }
  if (style.textDirection) {
    parts.push(`<w:textDirection w:val="${style.textDirection}"/>`);
  }

  const numbering = numberingInfo.get(paragraph.id);
  if (numbering) {
    parts.push(
      `<w:numPr><w:ilvl w:val="${numbering.level}"/><w:numId w:val="${numbering.numId}"/></w:numPr>`,
    );
  }

  return parts.length > 0 ? `<w:pPr>${parts.join("")}</w:pPr>` : "";
}
