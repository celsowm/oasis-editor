import type {
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorTabStop,
  EditorNamedStyle,
  EditorTableConditionalFlags,
} from "@/core/model.js";
import {
  escapeXml,
  normalizeDocxColor,
  pointsToTwips,
  pxToTwips,
  toTwips,
} from "@/export/docx/xmlUtils.js";
import { serializeParagraphBorders } from "@/export/docx/borders.js";
import { materializeParagraphStyle } from "./styleMaterialization.js";
import { TABLE_CONDITIONAL_FLAG_ATTRIBUTES } from "@/core/docxTableMaps.js";

function serializeParagraphTabs(
  tabs: EditorTabStop[] | null | undefined,
): string {
  if (!tabs || tabs.length === 0) {
    return "";
  }

  const parts = tabs
    .map((tab): string => {
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

/**
 * Serializes `w:cnfStyle` (conditional style flags) into the 12-bit legacy
 * bitmask form (`w:val`). Flag order matches `TABLE_CONDITIONAL_FLAG_ATTRIBUTES`,
 * the same order used by the import parser. Returns "" when no flags are set.
 */
function serializeConditionalStyle(
  flags: EditorTableConditionalFlags | null | undefined,
): string {
  if (!flags) {
    return "";
  }
  const bits = TABLE_CONDITIONAL_FLAG_ATTRIBUTES.map(([, key]): string =>
    flags[key] ? "1" : "0",
  ).join("");
  return `<w:cnfStyle w:val="${bits}"/>`;
}

/**
 * Serializes the paragraph decoration elements (CJK typography, RTL, legacy and
 * positional flags, plus non-drop-cap `w:framePr`). These are round-trip-only
 * properties. Default-on flags emit only an explicit `w:val="0"` (off); the
 * `w:pBdr` `between`/`bar` edges are emitted by `serializeParagraphBorders`.
 *
 * Element order is kept close to the OOXML schema, though (like the rest of
 * this serializer) not strictly enforced — Word tolerates the relaxed order.
 */
function serializeParagraphDecorations(style: EditorParagraphStyle): string[] {
  const parts: string[] = [];
  if (style.framePrXml) {
    parts.push(style.framePrXml);
  }
  if (style.suppressLineNumbers) {
    parts.push("<w:suppressLineNumbers/>");
  }
  if (style.suppressAutoHyphens) {
    parts.push("<w:suppressAutoHyphens/>");
  }
  if (style.bidi) {
    parts.push("<w:bidi/>");
  }
  // Default-on flags: emit only when explicitly turned off.
  if (style.kinsoku === false) {
    parts.push('<w:kinsoku w:val="0"/>');
  }
  if (style.wordWrap === false) {
    parts.push('<w:wordWrap w:val="0"/>');
  }
  if (style.overflowPunct === false) {
    parts.push('<w:overflowPunct w:val="0"/>');
  }
  if (style.topLinePunct) {
    parts.push("<w:topLinePunct/>");
  }
  if (style.autoSpaceDE === false) {
    parts.push('<w:autoSpaceDE w:val="0"/>');
  }
  if (style.autoSpaceDN === false) {
    parts.push('<w:autoSpaceDN w:val="0"/>');
  }
  if (style.adjustRightInd === false) {
    parts.push('<w:adjustRightInd w:val="0"/>');
  }
  if (style.textAlignment) {
    parts.push(`<w:textAlignment w:val="${style.textAlignment}"/>`);
  }
  if (style.textboxTightWrap) {
    parts.push(`<w:textboxTightWrap w:val="${style.textboxTightWrap}"/>`);
  }
  if (style.divId != null) {
    parts.push(`<w:divId w:val="${style.divId}"/>`);
  }
  const cnfStyle = serializeConditionalStyle(style.conditionalStyle);
  if (cnfStyle) {
    parts.push(cnfStyle);
  }
  return parts;
}

/**
 * Serializes a raw `EditorParagraphStyle` into the contents of a `w:pPr`
 * element (without the wrapping tag). Used for style definitions in styles.xml
 * and as the inner implementation for `serializeParagraphProperties`.
 *
 * Returns the full `<w:pPr>...</w:pPr>` string, or `""` when no properties.
 */
export function serializeParagraphStyleXml(
  style: EditorParagraphStyle,
): string {
  const parts: string[] = [];

  if (style.align) {
    parts.push(`<w:jc w:val="${style.align}"/>`);
  }

  if (
    style.spacingBefore !== undefined ||
    style.spacingAfter !== undefined ||
    style.lineHeight !== undefined
  ) {
    const attrs: string[] = [];
    const before = toTwips(style.spacingBefore);
    const after = toTwips(style.spacingAfter);
    const hasLineHeight =
      style.lineHeight !== undefined &&
      style.lineHeight !== null &&
      Number.isFinite(style.lineHeight);
    const isAbsoluteRule =
      style.lineRule === "exact" || style.lineRule === "atLeast";
    const line = hasLineHeight
      ? isAbsoluteRule
        ? pxToTwips(style.lineHeight as number, 0)
        : Math.round((style.lineHeight as number) * 240)
      : null;
    if (before !== null) attrs.push(`w:before="${before}"`);
    if (after !== null) attrs.push(`w:after="${after}"`);
    if (line !== null) attrs.push(`w:line="${line}"`);
    if (line !== null && isAbsoluteRule) {
      attrs.push(`w:lineRule="${style.lineRule}"`);
    }
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
  if (style.mirrorIndents) parts.push("<w:mirrorIndents/>");

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
  if (style.outlineLevel != null) {
    parts.push(`<w:outlineLvl w:val="${style.outlineLevel}"/>`);
  }

  parts.push(...serializeParagraphDecorations(style));

  return parts.length > 0 ? `<w:pPr>${parts.join("")}</w:pPr>` : "";
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

  if (paragraph.style?.styleId) {
    parts.push(`<w:pStyle w:val="${escapeXml(paragraph.style.styleId)}"/>`);
  }

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
    const hasLineHeight =
      style.lineHeight !== undefined &&
      style.lineHeight !== null &&
      Number.isFinite(style.lineHeight);
    const isAbsoluteRule =
      style.lineRule === "exact" || style.lineRule === "atLeast";
    // For exact/atLeast, lineHeight is an absolute px height → emit twips with
    // the rule. Otherwise lineHeight is a multiplier → 240ths of a line (auto).
    const line = hasLineHeight
      ? isAbsoluteRule
        ? pxToTwips(style.lineHeight as number, 0)
        : Math.round((style.lineHeight as number) * 240)
      : null;
    if (before !== null) attrs.push(`w:before="${before}"`);
    if (after !== null) attrs.push(`w:after="${after}"`);
    if (line !== null) attrs.push(`w:line="${line}"`);
    if (line !== null && isAbsoluteRule) {
      attrs.push(`w:lineRule="${style.lineRule}"`);
    }
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
  if (style.mirrorIndents) parts.push("<w:mirrorIndents/>");

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
  if (style.outlineLevel != null) {
    parts.push(`<w:outlineLvl w:val="${style.outlineLevel}"/>`);
  }

  parts.push(...serializeParagraphDecorations(style));

  const numbering = numberingInfo.get(paragraph.id);
  if (numbering) {
    parts.push(
      `<w:numPr><w:ilvl w:val="${numbering.level}"/><w:numId w:val="${numbering.numId}"/></w:numPr>`,
    );
  }

  return parts.length > 0 ? `<w:pPr>${parts.join("")}</w:pPr>` : "";
}
