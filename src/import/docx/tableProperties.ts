import { XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  EditorDocxWidthValue,
  EditorParagraphNode,
  EditorTableCellStyle,
  EditorTableLayout,
  EditorTableRowNode,
  EditorTableRowStyle,
  EditorTableStyle,
} from "@/core/model.js";
import {
  WORD_NS,
  getFirstChildByTagNameNS,
  getAttributeValue,
  parseOnOffProperty,
  parseTextDirection,
} from "./xmlHelpers.js";
import { type EditorTableBorders, parseDocxBoxBorders } from "./borders.js";
import { twipsToPoints } from "./units.js";
import { emptyOrUndefined, parseShdFill } from "./styleUtils.js";
import { type ParagraphAutospacingFlags } from "./paragraphStyle.js";

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
    return Number.isFinite(pct)
      ? `${Math.round(pct * 10000) / 10000}%`
      : undefined;
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

function serializeChildXml(
  parent: XmlElement | null,
  localNames: string[],
): string[] | undefined {
  if (!parent) {
    return undefined;
  }
  const names = new Set(localNames);
  const serializer = new XMLSerializer();
  const result: string[] = [];
  const children = parent.childNodes;
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (
      node?.nodeType === node.ELEMENT_NODE &&
      (node as XmlElement).namespaceURI === WORD_NS &&
      names.has((node as XmlElement).localName ?? "")
    ) {
      result.push(serializer.serializeToString(node as XmlElement));
    }
  }
  return result.length > 0 ? result : undefined;
}

function parseFloatingTableProperties(
  tblPr: XmlElement | null,
): Record<string, string> | undefined {
  const tblpPr = getFirstChildByTagNameNS(tblPr, WORD_NS, "tblpPr");
  if (!tblpPr || !tblpPr.attributes || tblpPr.attributes.length === 0) {
    return undefined;
  }
  const floating: Record<string, string> = {};
  for (let index = 0; index < tblpPr.attributes.length; index += 1) {
    const attr = tblpPr.attributes.item(index);
    if (attr?.namespaceURI === WORD_NS || attr?.prefix === "w") {
      floating[attr.localName || attr.name.replace(/^w:/, "")] = attr.value;
    }
  }
  return Object.keys(floating).length > 0 ? floating : undefined;
}

function parseCellMargins(
  container: XmlElement | null,
): EditorTableStyle["defaultCellMargins"] | undefined {
  if (!container) {
    return undefined;
  }
  const edgePt = (edge: string) =>
    twipsToPoints(
      getAttributeValue(getFirstChildByTagNameNS(container, WORD_NS, edge), "w"),
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
  if (jc === "left" || jc === "center" || jc === "right") {
    style.align = jc;
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

  const defaultCellMargins = parseCellMargins(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblCellMar"),
  );
  if (defaultCellMargins) {
    style.defaultCellMargins = defaultCellMargins;
  }

  const bidiVisual = tblPr ? parseOnOffProperty(tblPr, "bidiVisual") : undefined;
  if (bidiVisual !== undefined) {
    style.bidiVisual = bidiVisual;
  }

  const tblOverlap = getAttributeValue(
    getFirstChildByTagNameNS(tblPr, WORD_NS, "tblOverlap"),
    "val",
  );
  if (tblOverlap) {
    style.tblOverlap = tblOverlap;
  }

  const floating = parseFloatingTableProperties(tblPr);
  if (floating) {
    style.floating = floating;
  }

  const revisionXml = serializeChildXml(tblPr, ["tblPrChange"]);
  if (revisionXml) {
    style.revisionXml = revisionXml;
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

  const cantSplit = parseOnOffProperty(rowProperties, "cantSplit");
  if (cantSplit !== undefined) {
    style.cantSplit = cantSplit;
  }
  const hidden = parseOnOffProperty(rowProperties, "hidden");
  if (hidden !== undefined) {
    style.hidden = hidden;
  }

  const revisionXml = serializeChildXml(rowProperties, [
    "trPrChange",
    "ins",
    "del",
  ]);
  if (revisionXml) {
    style.revisionXml = revisionXml;
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
  const fill = parseShdFill(shading);
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
      style.width = `${Math.round((pct / 50) * 10000) / 10000}%`;
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
  const revisionXml = serializeChildXml(cellProperties, [
    "tcPrChange",
    "cellIns",
    "cellDel",
    "cellMerge",
  ]);
  if (revisionXml) {
    style.revisionXml = revisionXml;
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
  const styleOf = (paragraph: EditorParagraphNode) => (paragraph.style ??= {});

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

      if (
        rowIndex === 0 &&
        style.borderTop === undefined &&
        tblBorders.borderTop
      ) {
        style.borderTop = tblBorders.borderTop;
      }
      if (
        rowIndex === lastRowIndex &&
        style.borderBottom === undefined &&
        tblBorders.borderBottom
      ) {
        style.borderBottom = tblBorders.borderBottom;
      }
      if (
        colIndex === 0 &&
        style.borderLeft === undefined &&
        tblBorders.borderLeft
      ) {
        style.borderLeft = tblBorders.borderLeft;
      }
      if (
        colIndex === lastColIndex &&
        style.borderRight === undefined &&
        tblBorders.borderRight
      ) {
        style.borderRight = tblBorders.borderRight;
      }
      if (
        rowIndex < lastRowIndex &&
        style.borderBottom === undefined &&
        tblBorders.borderInsideH
      ) {
        style.borderBottom = tblBorders.borderInsideH;
      }
      if (
        colIndex < lastColIndex &&
        style.borderRight === undefined &&
        tblBorders.borderInsideV
      ) {
        style.borderRight = tblBorders.borderInsideV;
      }

      if (Object.keys(style).length > 0 && cell.style !== style) {
        cell.style = style;
      }
    }
  }
}
