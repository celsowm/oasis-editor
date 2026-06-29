import type {
  EditorNamedStyle,
  EditorTableCellStyle,
  EditorTableConditionalFormat,
  EditorTableStyle,
} from "@/core/model.js";
import { TABLE_BORDER_EDGE_KEYS } from "@/core/docxTableMaps.js";
import { escapeXml, pointsToTwips, WORD14_NS } from "./xmlUtils.js";
import { serializeDocxBorderAttrs } from "./borders.js";
import { serializeParagraphStyleXml } from "./text/paragraphPropertiesXml.js";
import { serializeRunProperties } from "./text/runPropertiesXml.js";
import {
  serializeTableCellStyleXml,
  serializeTableRowStyleXml,
} from "./tableXml.js";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/** Conditional type keys in Word's precedence order for round-trip. */
const CONDITIONAL_TYPE_ORDER = [
  "wholeTable",
  "band1Horz",
  "band2Horz",
  "band1Vert",
  "band2Vert",
  "firstCol",
  "lastCol",
  "firstRow",
  "lastRow",
  "nwCell",
  "neCell",
  "swCell",
  "seCell",
];

function serializeConditionalTcPr(cond: EditorTableConditionalFormat): string {
  // The conditional's full cell properties (`cellStyle`) take precedence, but
  // `shading` and `borders` may be carried separately on the conditional (they
  // are parsed from `w:shd`/`w:tcBorders` independently of the full `w:tcPr`).
  // Fold them in as fallbacks so they are never dropped when a cellStyle exists.
  const cellStyle: EditorTableCellStyle = {
    ...(cond.borders
      ? {
          ...(cond.borders.borderTop
            ? { borderTop: cond.borders.borderTop }
            : {}),
          ...(cond.borders.borderLeft
            ? { borderLeft: cond.borders.borderLeft }
            : {}),
          ...(cond.borders.borderBottom
            ? { borderBottom: cond.borders.borderBottom }
            : {}),
          ...(cond.borders.borderRight
            ? { borderRight: cond.borders.borderRight }
            : {}),
        }
      : {}),
    ...(cond.shading ? { shading: cond.shading } : {}),
    ...cond.cellStyle,
  };
  return Object.keys(cellStyle).length > 0
    ? serializeTableCellStyleXml(cellStyle)
    : "";
}

function serializeWidthElement(
  name: string,
  value: EditorTableStyle["width"],
): string {
  if (typeof value === "number") {
    return `<w:${name} w:w="${pointsToTwips(value) ?? 0}" w:type="dxa"/>`;
  }
  if (typeof value === "string" && value.endsWith("%")) {
    const percent = Number.parseFloat(value);
    return Number.isFinite(percent)
      ? `<w:${name} w:w="${Math.round(percent * 50)}" w:type="pct"/>`
      : "";
  }
  return value === "auto" ? `<w:${name} w:w="0" w:type="auto"/>` : "";
}

function serializeTableStyleProperties(
  style: EditorTableStyle | undefined,
): string {
  if (!style) return "";
  const parts: string[] = [];
  if (style.rowBandSize !== undefined)
    parts.push(`<w:tblStyleRowBandSize w:val="${style.rowBandSize}"/>`);
  if (style.colBandSize !== undefined)
    parts.push(`<w:tblStyleColBandSize w:val="${style.colBandSize}"/>`);
  const width = serializeWidthElement("tblW", style.width);
  if (width) parts.push(width);
  const indent = serializeWidthElement("tblInd", style.indentLeft);
  if (indent) parts.push(indent);
  const spacing = serializeWidthElement("tblCellSpacing", style.cellSpacing);
  if (spacing) parts.push(spacing);
  if (style.align) parts.push(`<w:jc w:val="${style.align}"/>`);
  if (style.layout) parts.push(`<w:tblLayout w:type="${style.layout}"/>`);
  if (style.bidiVisual !== undefined)
    parts.push(`<w:bidiVisual w:val="${style.bidiVisual ? "1" : "0"}"/>`);
  if (style.defaultCellMargins) {
    const margins = Object.entries(style.defaultCellMargins)
      .map(
        ([name, value]): string =>
          `<w:${name} w:w="${pointsToTwips(value) ?? 0}" w:type="dxa"/>`,
      )
      .join("");
    if (margins) parts.push(`<w:tblCellMar>${margins}</w:tblCellMar>`);
  }
  if (style.borders) {
    const { borders } = style;
    const xml = TABLE_BORDER_EDGE_KEYS.filter(
      ([, key]): boolean => !!borders[key],
    )
      .map(
        ([name, key]): string =>
          `<w:${name} ${serializeDocxBorderAttrs(borders[key]!)}`,
      )
      .join("");
    if (xml) parts.push(`<w:tblBorders>${xml}</w:tblBorders>`);
  }
  return parts.length > 0 ? `<w:tblPr>${parts.join("")}</w:tblPr>` : "";
}

function serializeConditionalBlock(
  type: string,
  cond: EditorTableConditionalFormat,
): string {
  const parts: string[] = [];
  const pPr = cond.paragraphStyle
    ? serializeParagraphStyleXml(cond.paragraphStyle)
    : "";
  if (pPr) parts.push(pPr);
  const rPr = cond.textStyle ? serializeRunProperties(cond.textStyle) : "";
  if (rPr) parts.push(rPr);
  const tblPr = serializeTableStyleProperties(cond.tableStyle);
  if (tblPr) parts.push(tblPr);
  const trPr = cond.rowStyle ? serializeTableRowStyleXml(cond.rowStyle) : "";
  if (trPr) parts.push(trPr);
  const tcPr = serializeConditionalTcPr(cond);
  if (tcPr) parts.push(tcPr);
  if (parts.length === 0) return "";
  return `<w:tblStylePr w:type="${escapeXml(type)}">${parts.join("")}</w:tblStylePr>`;
}

function serializeNamedStyle(style: EditorNamedStyle): string {
  const parts: string[] = [];
  parts.push(`<w:name w:val="${escapeXml(style.name)}"/>`);
  if (style.basedOn) {
    parts.push(`<w:basedOn w:val="${escapeXml(style.basedOn)}"/>`);
  }
  if (style.nextStyle) {
    parts.push(`<w:next w:val="${escapeXml(style.nextStyle)}"/>`);
  }
  if (style.uiPriority !== undefined) {
    parts.push(
      `<w:uiPriority w:val="${Math.max(0, Math.floor(style.uiPriority))}"/>`,
    );
  }
  if (style.qFormat !== undefined) {
    parts.push(`<w:qFormat w:val="${style.qFormat ? "1" : "0"}"/>`);
  }
  if (style.semiHidden !== undefined) {
    parts.push(`<w:semiHidden w:val="${style.semiHidden ? "1" : "0"}"/>`);
  }
  if (style.unhideWhenUsed !== undefined) {
    parts.push(
      `<w:unhideWhenUsed w:val="${style.unhideWhenUsed ? "1" : "0"}"/>`,
    );
  }

  if (style.type === "paragraph" || style.type === "table") {
    if (style.paragraphStyle) {
      const pPr = serializeParagraphStyleXml(style.paragraphStyle);
      if (pPr) parts.push(pPr);
    }
  }
  if (style.textStyle) {
    const rPr = serializeRunProperties(style.textStyle);
    if (rPr) parts.push(rPr);
  }

  if (style.type === "table" && style.tableStyle) {
    const ts = style.tableStyle;
    const tblPr = serializeTableStyleProperties(ts);
    if (tblPr) parts.push(tblPr);

    if (ts.conditionalFormats) {
      const orderedKeys = [
        ...CONDITIONAL_TYPE_ORDER.filter(
          (k): boolean => k in ts.conditionalFormats!,
        ),
        ...Object.keys(ts.conditionalFormats).filter(
          (k): boolean => !CONDITIONAL_TYPE_ORDER.includes(k),
        ),
      ];
      for (const key of orderedKeys) {
        const cond = ts.conditionalFormats[key];
        if (cond) {
          const block = serializeConditionalBlock(key, cond);
          if (block) parts.push(block);
        }
      }
    }
  }

  const typeAttr =
    style.type === "character"
      ? "character"
      : style.type === "table"
        ? "table"
        : "paragraph";
  return `<w:style w:type="${typeAttr}" w:styleId="${escapeXml(style.id)}"${style.isDefault ? ' w:default="1"' : ""}>${parts.join("")}</w:style>`;
}

export function buildStylesXml(
  styles: Record<string, EditorNamedStyle>,
): string {
  const styleElements = Object.values(styles).map(serializeNamedStyle).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}">${styleElements}</w:styles>`;
}
