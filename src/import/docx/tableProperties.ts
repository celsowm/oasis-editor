import { type Element as XmlElement } from "@xmldom/xmldom";
import { roundTo } from "@/utils/round.js";
import type {
  EditorBorderStyle,
  EditorDocxWidthValue,
  EditorParagraphNode,
  EditorTableCellStyle,
  EditorTableFloatingLayout,
  EditorTableLayout,
  EditorTableRowNode,
  EditorTableRowStyle,
  EditorTableStyle,
  EditorRevisionMetadata,
  EditorTableConditionalFlags, EditorParagraphStyle } from "@/core/model.js";
import { TABLE_CONDITIONAL_FLAG_ATTRIBUTES } from "@/core/docxTableMaps.js";
import {
  WORD_NS,
  getFirstChildByTagNameNS,
  getAttributeValue,
  parseOnOffProperty,
  parseTextDirection,
} from "./xmlHelpers.js";
import {
  type EditorTableBorders,
  parseDocxBoxBorders,
  parseDocxTableBorders,
} from "./borders.js";
import { twipsToPoints } from "./units.js";
import { emptyOrUndefined, parseShdFill } from "./styleUtils.js";
import { type ParagraphAutospacingFlags } from "./paragraphStyle.js";
import { type ThemeColorMap } from "./themeColors.js";

// DOCX table/row/cell property parsers (w:tblPr / w:trPr / w:tcPr): widths,
// floating, layout, borders, shading, margins, spans, vertical merge, header
// rows. Extracted from tables.ts (S2). parseTableNode imports the entry parsers.

/**
 * Parses a DOCX width-like element (e.g. w:tblW, w:tblInd, w:tblCellSpacing,
 * w:wBefore, w:wAfter) into an editor width value:
 * - type="dxa" (or missing type) -> points (number)
 * - type="pct" -> "NN%" string
 * - type="auto" -> "auto"
 */
function parseDocxWidthValue(
  element: XmlElement | null,
): EditorDocxWidthValue | undefined {
  if (!element) {
    return undefined;
  }

  const type = getAttributeValue(element, "type");
  const raw = getAttributeValue(element, "w");

  if (type === "auto") {
    return "auto";
  }

  if (type === "pct") {
    if (!raw) {
      return undefined;
    }
    const pct = raw.trim().endsWith("%")
      ? Number.parseFloat(raw)
      : Number(raw) / 50;
    return Number.isFinite(pct) ? `${roundTo(pct, 4)}%` : undefined;
  }

  // Missing or "dxa" type is treated as twips.
  return twipsToPoints(raw);
}

function parsePositiveIntegerProperty(
  parent: XmlElement | null,
  localName: string,
): number | undefined {
  const element = getFirstChildByTagNameNS(parent, WORD_NS, localName);
  const raw = getAttributeValue(element, "val");
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

export function parseTableConditionalFlags(
  properties: XmlElement | null,
): EditorTableConditionalFlags | undefined {
  const element = getFirstChildByTagNameNS(properties, WORD_NS, "cnfStyle");
  if (!element) return undefined;
  const rawBits = getAttributeValue(element, "val") ?? "";
  const flags: EditorTableConditionalFlags = {};
  TABLE_CONDITIONAL_FLAG_ATTRIBUTES.forEach(([attribute, key], index): void => {
    const explicit = getAttributeValue(element, attribute);
    if (explicit === "1" || explicit === "true" || explicit === "on") {
      flags[key] = true;
    } else if (explicit === "0" || explicit === "false" || explicit === "off") {
      flags[key] = false;
    } else if (rawBits.length === 12 && rawBits[index] === "1") {
      flags[key] = true;
    }
  });
  return Object.keys(flags).length > 0 ? flags : undefined;
}

function parseRevisionMetadata(element: XmlElement): EditorRevisionMetadata {
  const rawDate = getAttributeValue(element, "date");
  const parsedDate = rawDate ? Date.parse(rawDate) : Number.NaN;
  return {
    id: getAttributeValue(element, "id") ?? `revision:${element.localName}`,
    author: getAttributeValue(element, "author") ?? "Unknown",
    date: Number.isFinite(parsedDate) ? parsedDate : 0,
  };
}

function parseFloatingTableProperties(
  tblPr: XmlElement | null,
): EditorTableFloatingLayout | undefined {
  const tblpPr = getFirstChildByTagNameNS(tblPr, WORD_NS, "tblpPr");
  if (!tblpPr || !tblpPr.attributes || tblpPr.attributes.length === 0) {
    return undefined;
  }
  const attrs: Record<string, string> = {};
  for (let index = 0; index < tblpPr.attributes.length; index += 1) {
    const attr = tblpPr.attributes.item(index);
    if (attr?.namespaceURI === WORD_NS || attr?.prefix === "w") {
      attrs[attr.localName || attr.name.replace(/^w:/, "")] = attr.value;
    }
  }
  const point = (name: string): number | undefined =>
    twipsToPoints(attrs[name] ?? null);
  const horizontalAnchor =
    attrs.horzAnchor === "margin" ||
    attrs.horzAnchor === "page" ||
    attrs.horzAnchor === "text"
      ? attrs.horzAnchor
      : undefined;
  const verticalAnchor =
    attrs.vertAnchor === "margin" ||
    attrs.vertAnchor === "page" ||
    attrs.vertAnchor === "text"
      ? attrs.vertAnchor
      : undefined;
  const xAlign =
    attrs.tblpXSpec === "left" ||
    attrs.tblpXSpec === "center" ||
    attrs.tblpXSpec === "right" ||
    attrs.tblpXSpec === "inside" ||
    attrs.tblpXSpec === "outside"
      ? attrs.tblpXSpec
      : undefined;
  const yAlign =
    attrs.tblpYSpec === "top" ||
    attrs.tblpYSpec === "center" ||
    attrs.tblpYSpec === "bottom" ||
    attrs.tblpYSpec === "inside" ||
    attrs.tblpYSpec === "outside"
      ? attrs.tblpYSpec
      : undefined;
  return {
    ...(horizontalAnchor ? { horizontalAnchor } : {}),
    ...(verticalAnchor ? { verticalAnchor } : {}),
    ...(point("tblpX") !== undefined ? { x: point("tblpX") } : {}),
    ...(point("tblpY") !== undefined ? { y: point("tblpY") } : {}),
    ...(xAlign ? { xAlign } : {}),
    ...(yAlign ? { yAlign } : {}),
    ...(point("topFromText") !== undefined
      ? { distanceTop: point("topFromText") }
      : {}),
    ...(point("rightFromText") !== undefined
      ? { distanceRight: point("rightFromText") }
      : {}),
    ...(point("bottomFromText") !== undefined
      ? { distanceBottom: point("bottomFromText") }
      : {}),
    ...(point("leftFromText") !== undefined
      ? { distanceLeft: point("leftFromText") }
      : {}),
  };
}

function parseCellMargins(
  container: XmlElement | null,
): EditorTableStyle["defaultCellMargins"] | undefined {
  if (!container) {
    return undefined;
  }
  const edgePt = (edge: string): number | undefined =>
    twipsToPoints(
      getAttributeValue(
        getFirstChildByTagNameNS(container, WORD_NS, edge),
        "w",
      ),
    );
  const margins: NonNullable<EditorTableStyle["defaultCellMargins"]> = {};
  const top = edgePt("top");
  const right = edgePt("right");
  const bottom = edgePt("bottom");
  const left = edgePt("left");
  const start = edgePt("start");
  const end = edgePt("end");
  if (top !== undefined) margins.top = top;
  if (right !== undefined) margins.right = right;
  if (bottom !== undefined) margins.bottom = bottom;
  if (left !== undefined) margins.left = left;
  if (start !== undefined) margins.start = start;
  if (end !== undefined) margins.end = end;
  return Object.keys(margins).length > 0 ? margins : undefined;
}

function parseTableLayout(
  tblPr: XmlElement | null,
): EditorTableLayout | undefined {
  const value = getAttributeValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblLayout"),
    "type",
  );
  return value === "fixed" || value === "autofit" ? value : undefined;
}

export function parseTableStyle(
  tblPr: XmlElement | null,
  tableStyleId?: string,
): EditorTableStyle | undefined {
  const style: EditorTableStyle = {};

  if (tableStyleId) {
    style.styleId = tableStyleId;
  }

  const altTitle = getAttributeValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblCaption"),
    "val",
  );
  if (altTitle) {
    style.altTitle = altTitle;
  }

  const altDescription = getAttributeValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblDescription"),
    "val",
  );
  if (altDescription) {
    style.altDescription = altDescription;
  }

  const width = parseDocxWidthValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblW"),
  );
  if (width !== undefined) {
    style.width = width;
  }

  const indentLeft = parseDocxWidthValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblInd"),
  );
  if (indentLeft !== undefined) {
    style.indentLeft = indentLeft;
  }

  const jc = getAttributeValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "jc"),
    "val",
  );
  // `start`/`end` are logical aliases for `left`/`right` in LTR context.
  if (jc === "left" || jc === "start") {
    style.align = "left";
  } else if (jc === "center") {
    style.align = "center";
  } else if (jc === "right" || jc === "end") {
    style.align = "right";
  }

  const layout = parseTableLayout(tblPr);
  if (layout) {
    style.layout = layout;
  }

  const cellSpacing = parseDocxWidthValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblCellSpacing"),
  );
  if (cellSpacing !== undefined) {
    style.cellSpacing = cellSpacing;
  }
  const borders = parseDocxTableBorders(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblBorders"),
  );
  if (Object.keys(borders).length > 0) style.borders = borders;

  const defaultCellMargins = parseCellMargins(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblCellMar"),
  );
  if (defaultCellMargins) {
    style.defaultCellMargins = defaultCellMargins;
  }

  const bidiVisual = tblPr
    ? parseOnOffProperty(tblPr, "bidiVisual")
    : undefined;
  if (bidiVisual !== undefined) {
    style.bidiVisual = bidiVisual;
  }

  const tblOverlap = getAttributeValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblOverlap"),
    "val",
  );
  if (tblOverlap === "overlap" || tblOverlap === "never") {
    style.tblOverlap = tblOverlap;
  }

  const floating = parseFloatingTableProperties(tblPr);
  if (floating) {
    style.floating = floating;
  }

  const rowBandSize = parsePositiveIntegerProperty(
    tblPr,
    "tblStyleRowBandSize",
  );
  if (rowBandSize !== undefined) style.rowBandSize = rowBandSize;
  const colBandSize = parsePositiveIntegerProperty(
    tblPr,
    "tblStyleColBandSize",
  );
  if (colBandSize !== undefined) style.colBandSize = colBandSize;

  const tblLook = getFirstChildByTagNameNS(tblPr, WORD_NS, "tblLook");
  if (tblLook) {
    const raw = getAttributeValue(tblLook, "val");
    const mask = raw ? Number.parseInt(raw, 16) : Number.NaN;
    const flag = (name: string, bit: number, fallback: boolean): boolean => {
      const value = getAttributeValue(tblLook, name);
      if (value !== null && value !== "") {
        return value === "1" || value === "true" || value === "on";
      }
      return Number.isFinite(mask) ? (mask & bit) !== 0 : fallback;
    };
    style.tblLook = {
      firstRow: flag("firstRow", 0x0020, true),
      lastRow: flag("lastRow", 0x0040, false),
      firstCol: flag("firstColumn", 0x0080, true),
      lastCol: flag("lastColumn", 0x0100, false),
      noHBand: flag("noHBand", 0x0200, false),
      noVBand: flag("noVBand", 0x0400, false),
    };
  }

  const change = getFirstChildByTagNameNS(tblPr, WORD_NS, "tblPrChange");
  const previousProperties = getFirstChildByTagNameNS(change, WORD_NS, "tblPr");
  if (change && previousProperties) {
    style.revision = {
      ...parseRevisionMetadata(change),
      type: "property",
      previous: parseTableStyle(previousProperties) ?? {},
    };
  }

  return emptyOrUndefined(style);
}

export function parseTableRowStyle(
  rowProperties: XmlElement | null,
): EditorTableRowStyle | undefined {
  if (!rowProperties) {
    return undefined;
  }

  const style: EditorTableRowStyle = {};
  const isHeader = parseOnOffProperty(rowProperties, "tblHeader");
  if (isHeader !== undefined) style.isHeader = isHeader;

  const gridBefore = parsePositiveIntegerProperty(rowProperties, "gridBefore");
  if (gridBefore !== undefined) {
    style.gridBefore = gridBefore;
  }

  const gridAfter = parsePositiveIntegerProperty(rowProperties, "gridAfter");
  if (gridAfter !== undefined) {
    style.gridAfter = gridAfter;
  }

  const widthBefore = parseDocxWidthValue(
    getFirstChildByTagNameNS(rowProperties, WORD_NS, "wBefore"),
  );
  if (widthBefore !== undefined) {
    style.widthBefore = widthBefore;
  }

  const widthAfter = parseDocxWidthValue(
    getFirstChildByTagNameNS(rowProperties, WORD_NS, "wAfter"),
  );
  if (widthAfter !== undefined) {
    style.widthAfter = widthAfter;
  }

  const trHeight = getFirstChildByTagNameNS(rowProperties, WORD_NS, "trHeight");
  const height = twipsToPoints(getAttributeValue(trHeight, "val"));
  if (height !== undefined) {
    style.height = height;
  }
  const hRule = getAttributeValue(trHeight, "hRule");
  if (hRule === "auto" || hRule === "exact" || hRule === "atLeast") {
    style.heightRule = hRule;
  }

  const cellSpacing = parseDocxWidthValue(
    getFirstChildByTagNameNS(rowProperties, WORD_NS, "tblCellSpacing"),
  );
  if (cellSpacing !== undefined) {
    style.cellSpacing = cellSpacing;
  }

  const rowJc = getAttributeValue(
    getFirstChildByTagNameNS(rowProperties, WORD_NS, "jc"),
    "val",
  );
  if (rowJc === "left" || rowJc === "start") {
    style.align = "left";
  } else if (rowJc === "center") {
    style.align = "center";
  } else if (rowJc === "right" || rowJc === "end") {
    style.align = "right";
  }

  const cantSplit = parseOnOffProperty(rowProperties, "cantSplit");
  if (cantSplit !== undefined) {
    style.cantSplit = cantSplit;
  }
  const hidden = parseOnOffProperty(rowProperties, "hidden");
  if (hidden !== undefined) {
    style.hidden = hidden;
  }

  const change = getFirstChildByTagNameNS(rowProperties, WORD_NS, "trPrChange");
  const previousProperties = getFirstChildByTagNameNS(change, WORD_NS, "trPr");
  if (change && previousProperties) {
    style.propertyRevision = {
      ...parseRevisionMetadata(change),
      type: "property",
      previous: parseTableRowStyle(previousProperties) ?? {},
    };
  }
  const inserted = getFirstChildByTagNameNS(rowProperties, WORD_NS, "ins");
  const deleted = getFirstChildByTagNameNS(rowProperties, WORD_NS, "del");
  const structural = inserted ?? deleted;
  if (structural) {
    style.revision = {
      ...parseRevisionMetadata(structural),
      type: inserted ? "insert" : "delete",
    };
  }

  return emptyOrUndefined(style);
}

export function getTableCellColSpan(cellProperties: XmlElement | null): number {
  if (!cellProperties) {
    return 1;
  }

  const gridSpan = getFirstChildByTagNameNS(
    cellProperties,
    WORD_NS,
    "gridSpan",
  );
  const value = getAttributeValue(gridSpan, "val");
  const parsed = value ? Number(value) : 1;
  return Number.isFinite(parsed) && parsed > 1 ? Math.floor(parsed) : 1;
}

export function getTableCellVMerge(
  cellProperties: XmlElement | null,
): "restart" | "continue" | undefined {
  if (!cellProperties) {
    return undefined;
  }

  const vMerge = getFirstChildByTagNameNS(cellProperties, WORD_NS, "vMerge");
  if (!vMerge) {
    return undefined;
  }

  const value = getAttributeValue(vMerge, "val");
  return value === "restart" ? "restart" : "continue";
}

/**
 * Legacy horizontal merge marker (`w:hMerge`). Like `w:vMerge`, `restart`
 * begins a merged run and an omitted/`continue` value continues it. Modern Word
 * uses `w:gridSpan` instead; on import we collapse `hMerge` runs into the
 * anchor cell's colspan so both representations render identically.
 */
export function getTableCellHMerge(
  cellProperties: XmlElement | null,
): "restart" | "continue" | undefined {
  if (!cellProperties) {
    return undefined;
  }

  const hMerge = getFirstChildByTagNameNS(cellProperties, WORD_NS, "hMerge");
  if (!hMerge) {
    return undefined;
  }

  const value = getAttributeValue(hMerge, "val");
  return value === "restart" ? "restart" : "continue";
}

function parseTableCellVerticalAlign(
  cellProperties: XmlElement | null,
): EditorTableCellStyle["verticalAlign"] | undefined {
  if (!cellProperties) {
    return undefined;
  }

  const vAlign = getFirstChildByTagNameNS(cellProperties, WORD_NS, "vAlign");
  const value = getAttributeValue(vAlign, "val");
  if (value === "top" || value === "bottom") {
    return value;
  }
  if (value === "center") {
    return "middle";
  }
  return undefined;
}

function parseTableCellBorders(
  cellProperties: XmlElement | null,
): Partial<EditorTableCellStyle> {
  if (!cellProperties) {
    return {};
  }

  return parseDocxBoxBorders(
    getFirstChildByTagNameNS(cellProperties, WORD_NS, "tcBorders"),
  );
}

export function parseTableCellStyle(
  cellProperties: XmlElement | null,
  tableDefaultMargins?: EditorTableStyle["defaultCellMargins"],
  colors?: ThemeColorMap,
): EditorTableCellStyle | undefined {
  if (!cellProperties) {
    if (!tableDefaultMargins) {
      return undefined;
    }
    return emptyOrUndefined({
      paddingTop: tableDefaultMargins.top,
      paddingRight: tableDefaultMargins.right,
      paddingBottom: tableDefaultMargins.bottom,
      paddingLeft: tableDefaultMargins.left,
      paddingStart: tableDefaultMargins.start,
      paddingEnd: tableDefaultMargins.end,
    });
  }

  const style: EditorTableCellStyle = {
    ...(tableDefaultMargins?.top !== undefined
      ? { paddingTop: tableDefaultMargins.top }
      : {}),
    ...(tableDefaultMargins?.right !== undefined
      ? { paddingRight: tableDefaultMargins.right }
      : {}),
    ...(tableDefaultMargins?.bottom !== undefined
      ? { paddingBottom: tableDefaultMargins.bottom }
      : {}),
    ...(tableDefaultMargins?.left !== undefined
      ? { paddingLeft: tableDefaultMargins.left }
      : {}),
    ...(tableDefaultMargins?.start !== undefined
      ? { paddingStart: tableDefaultMargins.start }
      : {}),
    ...(tableDefaultMargins?.end !== undefined
      ? { paddingEnd: tableDefaultMargins.end }
      : {}),
  };
  const shading = getFirstChildByTagNameNS(cellProperties, WORD_NS, "shd");
  const fill = parseShdFill(shading, colors);
  if (fill) {
    style.shading = fill;
  }

  const cellWidth = getFirstChildByTagNameNS(cellProperties, WORD_NS, "tcW");
  const cellWidthType = getAttributeValue(cellWidth, "type");
  const cellWidthValue = getAttributeValue(cellWidth, "w");
  if (cellWidthType === "dxa") {
    const width = twipsToPoints(cellWidthValue);
    if (width !== undefined) {
      style.width = width;
    }
  } else if (cellWidthType === "pct" && cellWidthValue) {
    const pct = Number(cellWidthValue);
    if (Number.isFinite(pct)) {
      style.width = `${roundTo(pct / 50, 4)}%`;
    }
  }

  const tcMar = parseCellMargins(
    getFirstChildByTagNameNS(cellProperties, WORD_NS, "tcMar"),
  );
  if (tcMar) {
    if (tcMar.top !== undefined) style.paddingTop = tcMar.top;
    if (tcMar.bottom !== undefined) style.paddingBottom = tcMar.bottom;
    if (tcMar.left !== undefined) style.paddingLeft = tcMar.left;
    if (tcMar.right !== undefined) style.paddingRight = tcMar.right;
    if (tcMar.start !== undefined) style.paddingStart = tcMar.start;
    if (tcMar.end !== undefined) style.paddingEnd = tcMar.end;
  }

  const verticalAlign = parseTableCellVerticalAlign(cellProperties);
  if (verticalAlign) {
    style.verticalAlign = verticalAlign;
  }

  const textDirection = parseTextDirection(
    getAttributeValue(
      getFirstChildByTagNameNS(cellProperties, WORD_NS, "textDirection"),
      "val",
    ),
  );
  if (textDirection) {
    style.textDirection = textDirection;
  }

  const noWrap = parseOnOffProperty(cellProperties, "noWrap");
  if (noWrap !== undefined) {
    style.noWrap = noWrap;
  }
  const fitText = parseOnOffProperty(cellProperties, "tcFitText");
  if (fitText !== undefined) {
    style.fitText = fitText;
  }
  const hideMark = parseOnOffProperty(cellProperties, "hideMark");
  if (hideMark !== undefined) {
    style.hideMark = hideMark;
  }
  const headers = getAttributeValue(
    getFirstChildByTagNameNS(cellProperties, WORD_NS, "headers"),
    "val",
  );
  if (headers) {
    style.headers = headers;
  }
  const change = getFirstChildByTagNameNS(
    cellProperties,
    WORD_NS,
    "tcPrChange",
  );
  const previousProperties = getFirstChildByTagNameNS(change, WORD_NS, "tcPr");
  if (change && previousProperties) {
    style.propertyRevision = {
      ...parseRevisionMetadata(change),
      type: "property",
      previous:
        parseTableCellStyle(previousProperties, undefined, colors) ?? {},
    };
  }
  const inserted = getFirstChildByTagNameNS(cellProperties, WORD_NS, "cellIns");
  const deleted = getFirstChildByTagNameNS(cellProperties, WORD_NS, "cellDel");
  const merged = getFirstChildByTagNameNS(cellProperties, WORD_NS, "cellMerge");
  const structural = inserted ?? deleted ?? merged;
  if (structural) {
    const originalMerge = getAttributeValue(structural, "vMergeOrig");
    style.revision = {
      ...parseRevisionMetadata(structural),
      type: inserted ? "insert" : deleted ? "delete" : "merge",
      ...(merged && originalMerge
        ? {
            previous: {
              vMerge: originalMerge === "restart" ? "restart" : "continue",
            },
          }
        : {}),
    };
  }

  for (const [key, border] of Object.entries(
    parseTableCellBorders(cellProperties),
  )) {
    if (border) {
      (style as Record<string, unknown>)[key] = border;
    }
  }

  return emptyOrUndefined(style);
}

export function isTableHeaderRow(rowNode: XmlElement): boolean {
  const rowProperties = getFirstChildByTagNameNS(rowNode, WORD_NS, "trPr");
  return rowProperties
    ? parseOnOffProperty(rowProperties, "tblHeader") === true
    : false;
}

/**
 * Reproduces Word's HTML-style margin collapsing for paragraphs that use "auto
 * spacing" (`w:beforeAutospacing` / `w:afterAutospacing`) inside a table cell.
 * Word ignores the literal before/after values for these margins and collapses
 * them: the first paragraph's auto before-space and the last paragraph's auto
 * after-space collapse to 0 against the cell edge, and two adjacent auto margins
 * collapse to their max instead of summing. Without this, oasis renders cells
 * taller than Word because every paragraph's spacing is summed in full.
 *
 * The flags array is parallel to `paragraphs` (one entry per `<w:p>` in the cell).
 */
export function collapseCellAutospacing(
  paragraphs: EditorParagraphNode[],
  flags: ParagraphAutospacingFlags[],
): void {
  const styleOf = (paragraph: EditorParagraphNode): EditorParagraphStyle => (paragraph.style ??= {});

  const lastIndex = paragraphs.length - 1;
  for (let index = 0; index < paragraphs.length; index += 1) {
    const flag = flags[index];
    if (!flag) {
      continue;
    }
    if (index === 0 && flag.before) {
      styleOf(paragraphs[index]!).spacingBefore = 0;
    }
    if (index === lastIndex && flag.after) {
      styleOf(paragraphs[index]!).spacingAfter = 0;
    }
  }

  for (let index = 0; index < lastIndex; index += 1) {
    if (!flags[index]?.after || !flags[index + 1]?.before) {
      continue;
    }
    const prev = styleOf(paragraphs[index]!);
    const next = styleOf(paragraphs[index + 1]!);
    // Collapse the adjacent auto margins into a single gap = max(after, before).
    if ((prev.spacingAfter ?? 0) >= (next.spacingBefore ?? 0)) {
      next.spacingBefore = 0;
    } else {
      prev.spacingAfter = 0;
    }
  }
}

type CellBorderKey =
  | "borderTop"
  | "borderBottom"
  | "borderLeft"
  | "borderRight";

function applyBorderIfMissing(
  style: EditorTableCellStyle,
  key: CellBorderKey,
  border: EditorBorderStyle | undefined,
  condition: boolean,
): void {
  if (condition && style[key] === undefined && border) {
    style[key] = border;
  }
}

export function applyTableBordersToRows(
  rows: EditorTableRowNode[],
  tblBorders: EditorTableBorders,
): void {
  if (Object.keys(tblBorders).length === 0) {
    return;
  }

  const lastRowIndex = rows.length - 1;
  for (let rowIndex = 0; rowIndex <= lastRowIndex; rowIndex += 1) {
    const row = rows[rowIndex]!;
    const lastColIndex = row.cells.length - 1;
    for (let colIndex = 0; colIndex <= lastColIndex; colIndex += 1) {
      const cell = row.cells[colIndex]!;
      const style: EditorTableCellStyle = cell.style ?? {};

      applyBorderIfMissing(
        style,
        "borderTop",
        tblBorders.borderTop,
        rowIndex === 0,
      );
      applyBorderIfMissing(
        style,
        "borderBottom",
        tblBorders.borderBottom,
        rowIndex === lastRowIndex,
      );
      applyBorderIfMissing(
        style,
        "borderLeft",
        tblBorders.borderLeft,
        colIndex === 0,
      );
      applyBorderIfMissing(
        style,
        "borderRight",
        tblBorders.borderRight,
        colIndex === lastColIndex,
      );
      applyBorderIfMissing(
        style,
        "borderBottom",
        tblBorders.borderInsideH,
        rowIndex < lastRowIndex,
      );
      applyBorderIfMissing(
        style,
        "borderRight",
        tblBorders.borderInsideV,
        colIndex < lastColIndex,
      );

      if (Object.keys(style).length > 0 && cell.style !== style) {
        cell.style = style;
      }
    }
  }
}
