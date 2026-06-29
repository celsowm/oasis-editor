import { type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorParagraphStyle, EditorTabStop } from "@/core/model.js";
import { DEFAULT_EDITOR_STYLES } from "@/core/editorState.js";
import { resolveEffectiveParagraphStyle } from "@/core/model.js";
import { roundTo } from "@/utils/round.js";
import {
  WORD_NS,
  getChildrenByTagNameNS,
  getFirstChildByTagNameNS,
  getAttributeValue,
  parseOnOffProperty,
  parseStyleIdProperty,
  parseTextDirection,
  isWordTrue,
} from "./xmlHelpers.js";
import {
  twipsToPx,
  twipsToPoints,
  DOCX_IMPLICIT_SINGLE_LINE_HEIGHT,
} from "./units.js";
import { parseDocxBoxBorders } from "./borders.js";
import {
  stripUndefined,
  emptyOrUndefined,
  parseShdFill,
} from "./styleUtils.js";
import { type ThemeColorMap } from "./themeColors.js";

export function normalizeImportedParagraphStyle(
  style: EditorParagraphStyle | undefined,
): EditorParagraphStyle | undefined {
  if (!style) {
    return undefined;
  }

  const effective = resolveEffectiveParagraphStyle(
    style,
    DEFAULT_EDITOR_STYLES,
  );
  const defaultEffective = resolveEffectiveParagraphStyle(
    undefined,
    DEFAULT_EDITOR_STYLES,
  );

  const normalized = stripUndefined({
    styleId: style.styleId,
    align:
      effective.align !== defaultEffective.align ? effective.align : undefined,
    spacingBefore:
      effective.spacingBefore !== defaultEffective.spacingBefore
        ? effective.spacingBefore
        : undefined,
    spacingAfter:
      effective.spacingAfter !== defaultEffective.spacingAfter
        ? effective.spacingAfter
        : undefined,
    contextualSpacing:
      style.contextualSpacing !== undefined ||
      effective.contextualSpacing !== defaultEffective.contextualSpacing
        ? effective.contextualSpacing
        : undefined,
    lineHeight:
      effective.lineHeight !== defaultEffective.lineHeight
        ? effective.lineHeight
        : undefined,
    lineRule: effective.lineRule ?? undefined,
    lineGridPitch: style.lineGridPitch ?? undefined,
    snapToGrid:
      style.snapToGrid !== undefined ||
      effective.snapToGrid !== defaultEffective.snapToGrid
        ? effective.snapToGrid
        : undefined,
    indentLeft:
      style.indentLeft !== undefined ||
      effective.indentLeft !== defaultEffective.indentLeft
        ? effective.indentLeft
        : undefined,
    indentRight:
      style.indentRight !== undefined ||
      effective.indentRight !== defaultEffective.indentRight
        ? effective.indentRight
        : undefined,
    indentFirstLine:
      style.indentFirstLine !== undefined ||
      effective.indentFirstLine !== defaultEffective.indentFirstLine
        ? effective.indentFirstLine
        : undefined,
    indentHanging:
      style.indentHanging !== undefined ||
      effective.indentHanging !== defaultEffective.indentHanging
        ? effective.indentHanging
        : undefined,
    pageBreakBefore:
      style.pageBreakBefore !== undefined ||
      effective.pageBreakBefore !== defaultEffective.pageBreakBefore
        ? effective.pageBreakBefore
        : undefined,
    keepWithNext:
      style.keepWithNext !== undefined ||
      effective.keepWithNext !== defaultEffective.keepWithNext
        ? effective.keepWithNext
        : undefined,
    keepLinesTogether:
      style.keepLinesTogether !== undefined ||
      effective.keepLinesTogether !== defaultEffective.keepLinesTogether
        ? effective.keepLinesTogether
        : undefined,
    widowControl:
      style.widowControl !== undefined ||
      effective.widowControl !== defaultEffective.widowControl
        ? effective.widowControl
        : undefined,
    shading: style.shading ?? undefined,
    borderTop: style.borderTop ?? undefined,
    borderRight: style.borderRight ?? undefined,
    borderBottom: style.borderBottom ?? undefined,
    borderLeft: style.borderLeft ?? undefined,
    tabs: style.tabs ?? undefined,
    textDirection: style.textDirection ?? undefined,
    outlineLevel: style.outlineLevel ?? undefined,
  });

  return normalized;
}

export function withDocxImplicitSingleLineHeight(
  style: EditorParagraphStyle | undefined,
): EditorParagraphStyle {
  if (style?.lineHeight !== undefined) {
    return style;
  }
  return {
    ...(style ?? {}),
    lineHeight: DOCX_IMPLICIT_SINGLE_LINE_HEIGHT,
  };
}

export interface ParagraphAutospacingFlags {
  before: boolean;
  after: boolean;
}

/**
 * Reads Word's "auto spacing" flags (`w:beforeAutospacing` / `w:afterAutospacing`)
 * from a paragraph's `<w:spacing>` element. When these are set, Word ignores the
 * literal before/after values and treats the margins as automatic HTML-style
 * collapsing margins. The flags are needed so containers (e.g. table cells) can
 * reproduce that collapsing; see `collapseCellAutospacing` in tables.ts.
 */
export function parseAutospacingFlags(
  paragraphProperties: XmlElement | null,
): ParagraphAutospacingFlags {
  const spacing = getFirstChildByTagNameNS(
    paragraphProperties,
    WORD_NS,
    "spacing",
  );
  return {
    before: isWordTrue(getAttributeValue(spacing, "beforeAutospacing")),
    after: isWordTrue(getAttributeValue(spacing, "afterAutospacing")),
  };
}

function parseParagraphTabs(paragraphProperties: XmlElement): EditorTabStop[] {
  const tabsElement = getFirstChildByTagNameNS(
    paragraphProperties,
    WORD_NS,
    "tabs",
  );
  if (!tabsElement) {
    return [];
  }

  const tabs: EditorTabStop[] = [];
  for (const tabElement of getChildrenByTagNameNS(
    tabsElement,
    WORD_NS,
    "tab",
  )) {
    const position = twipsToPoints(getAttributeValue(tabElement, "pos"));
    if (position === undefined) {
      continue;
    }

    const typeValue = getAttributeValue(tabElement, "val");
    const type =
      typeValue === "center" ||
      typeValue === "right" ||
      typeValue === "decimal" ||
      typeValue === "bar" ||
      typeValue === "clear"
        ? typeValue
        : "left";
    const leaderValue = getAttributeValue(tabElement, "leader");
    const leader =
      leaderValue === "dot" ||
      leaderValue === "hyphen" ||
      leaderValue === "underscore" ||
      leaderValue === "heavy" ||
      leaderValue === "middleDot"
        ? leaderValue
        : leaderValue === "none"
          ? "none"
          : undefined;

    tabs.push({
      position,
      type,
      ...(leader !== undefined ? { leader } : {}),
    });
  }

  return tabs;
}

export function parseParagraphStyle(
  paragraphProperties: XmlElement | null,
  colors?: ThemeColorMap,
): EditorParagraphStyle | undefined {
  if (!paragraphProperties) {
    return undefined;
  }

  const style: EditorParagraphStyle = {};
  const styleId = parseStyleIdProperty(paragraphProperties, "pStyle");
  if (styleId) {
    style.styleId = styleId;
  }
  const justification = getFirstChildByTagNameNS(
    paragraphProperties,
    WORD_NS,
    "jc",
  );
  const justificationValue = getAttributeValue(justification, "val");
  if (
    justificationValue === "left" ||
    justificationValue === "start" ||
    justificationValue === "center" ||
    justificationValue === "right" ||
    justificationValue === "end" ||
    justificationValue === "justify"
  ) {
    style.align =
      justificationValue === "start"
        ? "left"
        : justificationValue === "end"
          ? "right"
          : (justificationValue as "left" | "center" | "right" | "justify");
  } else if (
    justificationValue === "both" ||
    justificationValue === "distribute"
  ) {
    // Word OOXML uses "both" for full justification (both edges aligned)
    // and "distribute" for distributed justification (a variant of justify).
    style.align = "justify";
  }

  const spacing = getFirstChildByTagNameNS(
    paragraphProperties,
    WORD_NS,
    "spacing",
  );
  const before = getAttributeValue(spacing, "before");
  const after = getAttributeValue(spacing, "after");
  const line = getAttributeValue(spacing, "line");
  const lineRule = getAttributeValue(spacing, "lineRule");
  if (before) {
    style.spacingBefore = twipsToPx(before, 0);
  }
  if (after) {
    style.spacingAfter = twipsToPx(after, 0);
  }
  if (line) {
    if (lineRule === "exact" || lineRule === "atLeast") {
      // For exact/atLeast, w:line is an absolute height in twips; store it as
      // px (keeping sub-px precision) and remember the rule so layout treats it
      // as an absolute height instead of a multiplier.
      style.lineHeight = roundTo((Number(line) / 1440) * 96, 4);
      style.lineRule = lineRule;
    } else {
      // auto (default): w:line is in 240ths of a line, i.e. a multiplier.
      style.lineHeight = Number(line) / 240;
    }
  }
  const contextualSpacing = parseOnOffProperty(
    paragraphProperties,
    "contextualSpacing",
  );
  if (contextualSpacing !== undefined) {
    style.contextualSpacing = contextualSpacing;
  }

  const snapToGrid = parseOnOffProperty(paragraphProperties, "snapToGrid");
  if (snapToGrid !== undefined) {
    style.snapToGrid = snapToGrid;
  }

  const indent = getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "ind");
  // OOXML supports both physical (left/right) and logical (start/end) indents.
  // Prefer start/end when present to preserve modern bidi-aware documents.
  const left =
    getAttributeValue(indent, "start") ?? getAttributeValue(indent, "left");
  const right =
    getAttributeValue(indent, "end") ?? getAttributeValue(indent, "right");
  const firstLine = getAttributeValue(indent, "firstLine");
  const hanging = getAttributeValue(indent, "hanging");
  if (left) {
    style.indentLeft = twipsToPx(left, 0);
  }
  if (right) {
    style.indentRight = twipsToPx(right, 0);
  }
  if (hanging) {
    style.indentHanging = twipsToPx(hanging, 0);
    // When both are present, keep a deterministic behavior and let hanging win.
    style.indentFirstLine = undefined;
  } else if (firstLine) {
    style.indentFirstLine = twipsToPx(firstLine, 0);
  }

  const tabs = parseParagraphTabs(paragraphProperties);
  if (tabs.length > 0) {
    style.tabs = tabs;
  }

  const pageBreakBefore = parseOnOffProperty(
    paragraphProperties,
    "pageBreakBefore",
  );
  if (pageBreakBefore !== undefined) {
    style.pageBreakBefore = pageBreakBefore;
  }
  const keepNext = parseOnOffProperty(paragraphProperties, "keepNext");
  if (keepNext !== undefined) {
    style.keepWithNext = keepNext;
  }
  const keepLines = parseOnOffProperty(paragraphProperties, "keepLines");
  if (keepLines !== undefined) {
    style.keepLinesTogether = keepLines;
  }
  const widowControl = parseOnOffProperty(paragraphProperties, "widowControl");
  if (widowControl !== undefined) {
    style.widowControl = widowControl;
  }

  const paragraphBorders = getFirstChildByTagNameNS(
    paragraphProperties,
    WORD_NS,
    "pBdr",
  );
  if (paragraphBorders) {
    const { borderTop, borderRight, borderBottom, borderLeft } =
      parseDocxBoxBorders(paragraphBorders);
    if (borderTop) style.borderTop = borderTop;
    if (borderRight) style.borderRight = borderRight;
    if (borderBottom) style.borderBottom = borderBottom;
    if (borderLeft) style.borderLeft = borderLeft;
  }

  const shading = getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "shd");
  const shadingFill = parseShdFill(shading, colors);
  if (shadingFill) {
    style.shading = shadingFill;
  }

  const textDirection = parseTextDirection(
    getAttributeValue(
      getFirstChildByTagNameNS(paragraphProperties, WORD_NS, "textDirection"),
      "val",
    ),
  );
  if (textDirection) {
    style.textDirection = textDirection;
  }

  const outlineLvlEl = getFirstChildByTagNameNS(
    paragraphProperties,
    WORD_NS,
    "outlineLvl",
  );
  const outlineLvlVal = getAttributeValue(outlineLvlEl, "val");
  if (outlineLvlVal !== undefined) {
    const level = Number(outlineLvlVal);
    if (Number.isFinite(level) && level >= 0 && level <= 8) {
      style.outlineLevel = level;
    }
  }

  return emptyOrUndefined(style);
}
