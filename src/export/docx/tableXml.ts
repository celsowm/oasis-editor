import type {
  EditorBorderStyle,
  EditorParagraphNode,
  EditorTableCellNode,
  EditorTableNode,
} from "../../core/model.js";
import { buildTableCellLayout } from "../../core/tableLayout.js";
import { escapeXml, normalizeDocxColor, pointsToTwips } from "./xmlUtils.js";
import { serializeDocxBorderAttrs } from "./borders.js";

const DEFAULT_TABLE_BORDER_COLOR = "6F6F6F";
const DEFAULT_TABLE_BORDER_WIDTH_PT = 0.75;
const DEFAULT_CELL_PADDING_LEFT_RIGHT_PT = 5.4;

export type SerializeTableParagraphXml = (
  paragraph: EditorParagraphNode,
  cell: EditorTableCellNode,
) => string;

type DocxWidthTag =
  | "tblW"
  | "tcW"
  | "tblInd"
  | "tblCellSpacing"
  | "wBefore"
  | "wAfter";

/**
 * Serializes a DOCX width-like element from an editor width value:
 * - number -> w:type="dxa" (points converted to twips)
 * - "NN%" -> w:type="pct"
 * - "auto" -> w:type="auto" w:w="0"
 * - numeric string -> w:type="dxa" (raw twips, legacy behavior)
 */
function serializeDocxWidthElement(
  tag: DocxWidthTag,
  value: number | string | undefined,
  options: { fallbackAuto?: boolean } = {},
): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<w:${tag} w:w="${pointsToTwips(value) ?? 0}" w:type="dxa"/>`;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "auto") {
      return `<w:${tag} w:w="0" w:type="auto"/>`;
    }
    if (trimmed.endsWith("%")) {
      const parsed = Number.parseFloat(trimmed.slice(0, -1));
      if (Number.isFinite(parsed)) {
        return `<w:${tag} w:w="${Math.round(parsed * 50)}" w:type="pct"/>`;
      }
    }
    const parsed = Number.parseFloat(trimmed);
    if (Number.isFinite(parsed)) {
      return `<w:${tag} w:w="${Math.round(parsed)}" w:type="dxa"/>`;
    }
  }
  return options.fallbackAuto ? `<w:${tag} w:w="0" w:type="auto"/>` : "";
}

function serializeTableWidth(
  value: number | string | undefined,
  fallbackAuto = true,
): string {
  return serializeDocxWidthElement("tblW", value, { fallbackAuto });
}

function serializeCellWidth(value: number | string | undefined): string {
  return serializeDocxWidthElement("tcW", value);
}

function serializeBorder(border: EditorBorderStyle | undefined): string {
  const resolved = border ?? {
    width: DEFAULT_TABLE_BORDER_WIDTH_PT,
    type: "solid" as const,
    color: `#${DEFAULT_TABLE_BORDER_COLOR}`,
  };
  return serializeDocxBorderAttrs(resolved, DEFAULT_TABLE_BORDER_COLOR);
}

function serializeTableCellBorders(cell: EditorTableCellNode): string {
  const borders = [
    `<w:top ${serializeBorder(cell.style?.borderTop)}`,
    `<w:left ${serializeBorder(cell.style?.borderLeft)}`,
    `<w:bottom ${serializeBorder(cell.style?.borderBottom)}`,
    `<w:right ${serializeBorder(cell.style?.borderRight)}`,
  ];
  return `<w:tcBorders>${borders.join("")}</w:tcBorders>`;
}

function serializeTableCellMargins(cell: EditorTableCellNode): string {
  const style = cell.style;
  const uniform = style?.padding;
  const top = pointsToTwips(uniform ?? style?.paddingTop ?? 0);
  const bottom = pointsToTwips(uniform ?? style?.paddingBottom ?? 0);
  const left = pointsToTwips(
    uniform ?? style?.paddingLeft ?? DEFAULT_CELL_PADDING_LEFT_RIGHT_PT,
  );
  const right = pointsToTwips(
    uniform ?? style?.paddingRight ?? DEFAULT_CELL_PADDING_LEFT_RIGHT_PT,
  );

  return `<w:tcMar><w:top w:w="${top ?? 0}" w:type="dxa"/><w:left w:w="${
    left ?? 0
  }" w:type="dxa"/><w:bottom w:w="${bottom ?? 0}" w:type="dxa"/><w:right w:w="${
    right ?? 0
  }" w:type="dxa"/></w:tcMar>`;
}

function serializeTableCellProperties(
  cell: EditorTableCellNode,
  fallbackWidthPt?: number,
): string {
  const colSpan = Math.max(1, Math.floor(cell.colSpan ?? 1));
  const parts: string[] = [];

  const widthXml = serializeCellWidth(cell.style?.width ?? fallbackWidthPt);
  if (widthXml) {
    parts.push(widthXml);
  }

  if (colSpan > 1) {
    parts.push(`<w:gridSpan w:val="${colSpan}"/>`);
  }
  if (cell.vMerge === "restart") {
    parts.push('<w:vMerge w:val="restart"/>');
  } else if (cell.vMerge === "continue") {
    parts.push("<w:vMerge/>");
  }
  if (cell.style?.shading) {
    parts.push(
      `<w:shd w:val="clear" w:color="auto" w:fill="${normalizeDocxColor(cell.style.shading, "FFFFFF")}"/>`,
    );
  }
  if (cell.style?.verticalAlign) {
    const value =
      cell.style.verticalAlign === "middle"
        ? "center"
        : cell.style.verticalAlign;
    parts.push(`<w:vAlign w:val="${value}"/>`);
  }
  if (cell.style?.textDirection) {
    parts.push(`<w:textDirection w:val="${cell.style.textDirection}"/>`);
  }
  parts.push(serializeTableCellMargins(cell));
  parts.push(serializeTableCellBorders(cell));

  return parts.length > 0 ? `<w:tcPr>${parts.join("")}</w:tcPr>` : "";
}

function serializeGridSkip(
  tag: "gridBefore" | "gridAfter",
  value: number | undefined,
): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "";
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? `<w:${tag} w:val="${normalized}"/>` : "";
}

function serializeTableRowHeight(row: EditorTableNode["rows"][number]): string {
  const heightValue = row.style?.height;
  const heightRule = row.style?.heightRule;
  const height =
    typeof heightValue === "number"
      ? pointsToTwips(heightValue)
      : typeof heightValue === "string"
        ? Number.parseFloat(heightValue)
        : null;
  const hasHeight = height !== null && Number.isFinite(height);
  if (!hasHeight && !heightRule) {
    return "";
  }
  const attrs: string[] = [];
  if (hasHeight) {
    attrs.push(`w:val="${Math.round(height!)}"`);
  }
  // Preserve imported rule when present; otherwise default to atLeast for
  // editor-created heights (legacy behavior).
  attrs.push(`w:hRule="${heightRule ?? "atLeast"}"`);
  return `<w:trHeight ${attrs.join(" ")}/>`;
}

function serializeTableRowProperties(
  row: EditorTableNode["rows"][number],
): string {
  const parts: string[] = [];
  const gridBefore = serializeGridSkip("gridBefore", row.style?.gridBefore);
  if (gridBefore) {
    parts.push(gridBefore);
  }
  const gridAfter = serializeGridSkip("gridAfter", row.style?.gridAfter);
  if (gridAfter) {
    parts.push(gridAfter);
  }
  const widthBefore = serializeDocxWidthElement(
    "wBefore",
    row.style?.widthBefore,
  );
  if (widthBefore) {
    parts.push(widthBefore);
  }
  const widthAfter = serializeDocxWidthElement("wAfter", row.style?.widthAfter);
  if (widthAfter) {
    parts.push(widthAfter);
  }
  const height = serializeTableRowHeight(row);
  if (height) {
    parts.push(height);
  }
  if (row.isHeader) {
    parts.push("<w:tblHeader/>");
  }
  return parts.length > 0 ? `<w:trPr>${parts.join("")}</w:trPr>` : "";
}

function serializeTableProperties(table: EditorTableNode): string {
  const parts: string[] = [];
  if (table.style?.styleId) {
    parts.push(`<w:tblStyle w:val="${escapeXml(table.style.styleId)}"/>`);
  }
  const gridWidth =
    table.gridCols && table.gridCols.length > 0
      ? table.gridCols.reduce((sum, width) => sum + width, 0)
      : undefined;
  parts.push(serializeTableWidth(table.style?.width ?? gridWidth));
  if (table.style?.align) {
    parts.push(`<w:jc w:val="${table.style.align}"/>`);
  }
  const cellSpacingXml = serializeDocxWidthElement(
    "tblCellSpacing",
    table.style?.cellSpacing,
  );
  if (cellSpacingXml) {
    parts.push(cellSpacingXml);
  }
  const indentXml = serializeDocxWidthElement(
    "tblInd",
    table.style?.indentLeft,
  );
  if (indentXml) {
    parts.push(indentXml);
  }
  parts.push(`<w:tblLayout w:type="${table.style?.layout ?? "fixed"}"/>`);
  return `<w:tblPr>${parts.join("")}</w:tblPr>`;
}

export function serializeTableXml(
  table: EditorTableNode,
  serializeParagraphXml: SerializeTableParagraphXml,
): string {
  const tableLayout = buildTableCellLayout(table);
  const tableEntriesByKey = new Map(
    tableLayout.map(
      (entry) => [`${entry.rowIndex}:${entry.cellIndex}`, entry] as const,
    ),
  );
  const rowsXml = table.rows
    .map((row, rowIndex) => {
      const cellsXml = row.cells
        .map((cell, cellIndex) => {
          const entry = tableEntriesByKey.get(`${rowIndex}:${cellIndex}`);
          const fallbackWidthPt =
            entry && table.gridCols
              ? table.gridCols
                  .slice(
                    entry.visualColumnIndex,
                    entry.visualColumnIndex + Math.max(1, entry.colSpan),
                  )
                  .reduce((sum, width) => sum + width, 0)
              : undefined;
          const paragraphs =
            cell.blocks.length > 0
              ? cell.blocks
              : [
                  {
                    id: "",
                    type: "paragraph" as const,
                    runs: [{ id: "", text: "" }],
                  },
                ];
          const paragraphsXml = paragraphs
            .map((paragraph) => serializeParagraphXml(paragraph, cell))
            .join("");
          const contentXml =
            cell.vMerge === "continue" ? "<w:p/>" : paragraphsXml;
          return `<w:tc>${serializeTableCellProperties(cell, fallbackWidthPt)}${contentXml}</w:tc>`;
        })
        .join("");
      return `<w:tr>${row.tblPrExXml ?? ""}${serializeTableRowProperties(row)}${cellsXml}</w:tr>`;
    })
    .join("");
  const gridXml = table.gridCols
    ? `<w:tblGrid>${table.gridCols
        .map((width) => `<w:gridCol w:w="${pointsToTwips(width) ?? 0}"/>`)
        .join("")}</w:tblGrid>`
    : "";
  return `<w:tbl>${serializeTableProperties(table)}${gridXml}${rowsXml}</w:tbl>`;
}
