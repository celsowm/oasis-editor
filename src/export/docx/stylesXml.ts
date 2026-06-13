import type {
  EditorNamedStyle,
  EditorTableConditionalFormat,
} from "../../core/model.js";
import { escapeXml, normalizeDocxColor, pointsToTwips, WORD14_NS } from "./xmlUtils.js";
import { serializeDocxBorderAttrs } from "./borders.js";
import { serializeParagraphStyleXml } from "./text/paragraphPropertiesXml.js";
import { serializeRunProperties } from "./text/runPropertiesXml.js";
import { serializeTableRowStyleXml } from "./tableXml.js";

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
  const parts: string[] = [];
  if (cond.borders) {
    const b = cond.borders;
    const edges: Array<[string, typeof b.borderTop]> = [
      ["top", b.borderTop],
      ["left", b.borderLeft],
      ["bottom", b.borderBottom],
      ["right", b.borderRight],
    ];
    const borderXml = edges
      .filter((entry): entry is [string, NonNullable<typeof b.borderTop>] => entry[1] != null)
      .map(([name, border]) => `<w:${name} ${serializeDocxBorderAttrs(border)}`)
      .join("");
    if (borderXml) {
      parts.push(`<w:tcBorders>${borderXml}</w:tcBorders>`);
    }
  }
  if (cond.shading) {
    parts.push(
      `<w:shd w:val="clear" w:color="auto" w:fill="${normalizeDocxColor(cond.shading, "FFFFFF")}"/>`,
    );
  }
  return parts.length > 0 ? `<w:tcPr>${parts.join("")}</w:tcPr>` : "";
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
    const tblPrParts: string[] = [];
    if (ts.rowBandSize !== undefined) {
      tblPrParts.push(`<w:tblStyleRowBandSize w:val="${ts.rowBandSize}"/>`);
    }
    if (ts.colBandSize !== undefined) {
      tblPrParts.push(`<w:tblStyleColBandSize w:val="${ts.colBandSize}"/>`);
    }
    if (ts.indentLeft !== undefined) {
      const val =
        typeof ts.indentLeft === "number"
          ? pointsToTwips(ts.indentLeft)
          : null;
      if (val !== null) {
        tblPrParts.push(`<w:tblInd w:w="${val}" w:type="dxa"/>`);
      }
    }
    if (tblPrParts.length > 0) {
      parts.push(`<w:tblPr>${tblPrParts.join("")}</w:tblPr>`);
    }

    if (ts.conditionalFormats) {
      const orderedKeys = [
        ...CONDITIONAL_TYPE_ORDER.filter((k) => k in ts.conditionalFormats!),
        ...Object.keys(ts.conditionalFormats).filter(
          (k) => !CONDITIONAL_TYPE_ORDER.includes(k),
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

  const typeAttr = style.type === "character" ? "character" : style.type === "table" ? "table" : "paragraph";
  return `<w:style w:type="${typeAttr}" w:styleId="${escapeXml(style.id)}">${parts.join("")}</w:style>`;
}

export function buildStylesXml(
  styles: Record<string, EditorNamedStyle>,
): string {
  const styleElements = Object.values(styles)
    .map(serializeNamedStyle)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${WORD_NS}" xmlns:w14="${WORD14_NS}">${styleElements}</w:styles>`;
}
