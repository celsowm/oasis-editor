import type {
  EditorBorderStyle,
  EditorParagraphNode,
  EditorTableCellNode,
  EditorTableNode,
  EditorTableRowStyle,
  EditorTableStyle,
  EditorTableFloatingLayout,
  EditorTableConditionalFlags,
} from "@/core/model.js";
import { buildTableCellLayout } from "@/core/tableLayout.js";
import { escapeXml, normalizeDocxColor, pointsToTwips } from "./xmlUtils.js";
import { serializeDocxBorderAttrs } from "./borders.js";

const DEFAULT_TABLE_BORDER_COLOR = "6F6F6F";
const DEFAULT_TABLE_BORDER_WIDTH_PT = 0.75;
const DEFAULT_CELL_PADDING_LEFT_RIGHT_PT = 5.4;

function serializeExtAttributes(
  attrs: Record<string, string> | undefined,
): string {
  if (!attrs) return "";
  return Object.entries(attrs)
    .map(([name, value]) => ` ${name}="${escapeXml(value)}"`)
    .join("");
}

function serializeRevisionAttrs(revision: {
  id: string;
  author: string;
  date: number;
}): string {
  const numericId = /^\d+$/.test(revision.id)
    ? revision.id
    : String(
        Array.from(revision.id).reduce(
          (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
          0,
        ),
      );
  const date = Number.isFinite(revision.date)
    ? new Date(revision.date).toISOString()
    : new Date(0).toISOString();
  return `w:id="${numericId}" w:author="${escapeXml(revision.author)}" w:date="${date}"`;
}

function serializeConditionalFlags(
  flags: EditorTableConditionalFlags | undefined,
): string {
  if (!flags || Object.keys(flags).length === 0) return "";
  const attributes: Array<[string, keyof EditorTableConditionalFlags]> = [
    ["firstRow", "firstRow"],
    ["lastRow", "lastRow"],
    ["firstColumn", "firstCol"],
    ["lastColumn", "lastCol"],
    ["oddVBand", "band1Vert"],
    ["evenVBand", "band2Vert"],
    ["oddHBand", "band1Horz"],
    ["evenHBand", "band2Horz"],
    ["firstRowFirstColumn", "nwCell"],
    ["firstRowLastColumn", "neCell"],
    ["lastRowFirstColumn", "swCell"],
    ["lastRowLastColumn", "seCell"],
  ];
  const xml = attributes
    .filter(([, key]) => flags[key] !== undefined)
    .map(([name, key]) => `w:${name}="${flags[key] ? "1" : "0"}"`)
    .join(" ");
  return xml ? `<w:cnfStyle ${xml}/>` : "";
}

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

function serializeOnOffElement(
  tag: string,
  value: boolean | undefined,
): string {
  if (value === undefined) {
    return "";
  }
  return value ? `<w:${tag}/>` : `<w:${tag} w:val="0"/>`;
}

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
  if (cell.style?.borderStart) {
    borders.push(`<w:start ${serializeBorder(cell.style.borderStart)}`);
  }
  if (cell.style?.borderEnd) {
    borders.push(`<w:end ${serializeBorder(cell.style.borderEnd)}`);
  }
  if (cell.style?.borderTopLeftToBottomRight) {
    borders.push(
      `<w:tl2br ${serializeBorder(cell.style.borderTopLeftToBottomRight)}`,
    );
  }
  if (cell.style?.borderTopRightToBottomLeft) {
    borders.push(
      `<w:tr2bl ${serializeBorder(cell.style.borderTopRightToBottomLeft)}`,
    );
  }
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
  const start =
    style?.paddingStart !== undefined
      ? `<w:start w:w="${pointsToTwips(style.paddingStart) ?? 0}" w:type="dxa"/>`
      : "";
  const end =
    style?.paddingEnd !== undefined
      ? `<w:end w:w="${pointsToTwips(style.paddingEnd) ?? 0}" w:type="dxa"/>`
      : "";

  return `<w:tcMar><w:top w:w="${top ?? 0}" w:type="dxa"/><w:left w:w="${
    left ?? 0
  }" w:type="dxa"/><w:bottom w:w="${bottom ?? 0}" w:type="dxa"/><w:right w:w="${
    right ?? 0
  }" w:type="dxa"/>${start}${end}</w:tcMar>`;
}

function serializeTableDefaultCellMargins(
  margins: NonNullable<EditorTableNode["style"]>["defaultCellMargins"],
): string {
  if (!margins) {
    return "";
  }
  const parts: string[] = [];
  const edge = (
    name: "top" | "right" | "bottom" | "left" | "start" | "end",
    value: number | undefined,
  ) => {
    if (value !== undefined && Number.isFinite(value)) {
      parts.push(
        `<w:${name} w:w="${pointsToTwips(value) ?? 0}" w:type="dxa"/>`,
      );
    }
  };
  edge("top", margins.top);
  edge("left", margins.left);
  edge("bottom", margins.bottom);
  edge("right", margins.right);
  edge("start", margins.start);
  edge("end", margins.end);
  return parts.length > 0
    ? `<w:tblCellMar>${parts.join("")}</w:tblCellMar>`
    : "";
}

function serializeTableCellProperties(
  cell: EditorTableCellNode,
  fallbackWidthPt?: number,
): string {
  const colSpan = Math.max(1, Math.floor(cell.colSpan ?? 1));
  const parts: string[] = [];
  const conditional = serializeConditionalFlags(cell.conditionalStyle);
  if (conditional) parts.push(conditional);

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
  const noWrap = serializeOnOffElement("noWrap", cell.style?.noWrap);
  if (noWrap) {
    parts.push(noWrap);
  }
  const fitText = serializeOnOffElement("tcFitText", cell.style?.fitText);
  if (fitText) {
    parts.push(fitText);
  }
  if (cell.style?.headers) {
    parts.push(`<w:headers w:val="${escapeXml(cell.style.headers)}"/>`);
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
  const hideMark = serializeOnOffElement("hideMark", cell.style?.hideMark);
  if (hideMark) {
    parts.push(hideMark);
  }
  if (cell.style?.propertyRevision) {
    const revision = cell.style.propertyRevision;
    const previous = serializeTableCellProperties({
      ...cell,
      style: revision.previous,
    });
    parts.push(
      `<w:tcPrChange ${serializeRevisionAttrs(revision)}>${previous}</w:tcPrChange>`,
    );
  }
  if (cell.style?.revision) {
    const revision = cell.style.revision;
    const element =
      revision.type === "insert"
        ? "cellIns"
        : revision.type === "delete"
          ? "cellDel"
          : "cellMerge";
    const mergeAttrs =
      revision.type === "merge"
        ? `${revision.previous?.vMerge ? ` w:vMergeOrig="${revision.previous.vMerge === "restart" ? "rest" : "cont"}"` : ""}${cell.vMerge ? ` w:vMerge="${cell.vMerge === "restart" ? "rest" : "cont"}"` : ""}`
        : "";
    parts.push(
      `<w:${element} ${serializeRevisionAttrs(revision)}${mergeAttrs}/>`,
    );
  }

  return parts.length > 0 ? `<w:tcPr>${parts.join("")}</w:tcPr>` : "";
}

export function serializeTableCellStyleXml(
  style: EditorTableCellNode["style"],
): string {
  return serializeTableCellProperties({
    id: "table-style-cell",
    blocks: [],
    style,
  });
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

function serializeTableRowHeightFromStyle(
  heightValue: number | string | undefined,
  heightRule: EditorTableRowStyle["heightRule"] | undefined,
): string {
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
  attrs.push(`w:hRule="${heightRule ?? "atLeast"}"`);
  return `<w:trHeight ${attrs.join(" ")}/>`;
}

function serializeTableRowHeight(row: EditorTableNode["rows"][number]): string {
  return serializeTableRowHeightFromStyle(
    row.style?.height,
    row.style?.heightRule,
  );
}

/**
 * Serializes the core row style properties into `<w:trPr>` inner XML.
 * Used for style definitions (styles.xml) as well as per-row serialization.
 * Returns the full `<w:trPr>...</w:trPr>` element, or `""` when empty.
 */
export function serializeTableRowStyleXml(
  style: EditorTableRowStyle | undefined,
): string {
  if (!style) return "";
  const parts: string[] = [];
  const gridBefore = serializeGridSkip("gridBefore", style.gridBefore);
  if (gridBefore) parts.push(gridBefore);
  const gridAfter = serializeGridSkip("gridAfter", style.gridAfter);
  if (gridAfter) parts.push(gridAfter);
  const widthBefore = serializeDocxWidthElement("wBefore", style.widthBefore);
  if (widthBefore) parts.push(widthBefore);
  const widthAfter = serializeDocxWidthElement("wAfter", style.widthAfter);
  if (widthAfter) parts.push(widthAfter);
  const cellSpacingXml = serializeDocxWidthElement(
    "tblCellSpacing",
    style.cellSpacing,
  );
  if (cellSpacingXml) parts.push(cellSpacingXml);
  const heightXml = serializeTableRowHeightFromStyle(
    style.height,
    style.heightRule,
  );
  if (heightXml) parts.push(heightXml);
  const cantSplit = serializeOnOffElement("cantSplit", style.cantSplit);
  if (cantSplit) parts.push(cantSplit);
  const hidden = serializeOnOffElement("hidden", style.hidden);
  if (hidden) parts.push(hidden);
  const header = serializeOnOffElement("tblHeader", style.isHeader);
  if (header) parts.push(header);
  if (style.align) parts.push(`<w:jc w:val="${style.align}"/>`);
  return parts.length > 0 ? `<w:trPr>${parts.join("")}</w:trPr>` : "";
}

function serializeTableRowProperties(
  row: EditorTableNode["rows"][number],
): string {
  const parts: string[] = [];
  const conditional = serializeConditionalFlags(row.conditionalStyle);
  if (conditional) parts.push(conditional);
  const gridBefore = serializeGridSkip("gridBefore", row.style?.gridBefore);
  if (gridBefore) parts.push(gridBefore);
  const gridAfter = serializeGridSkip("gridAfter", row.style?.gridAfter);
  if (gridAfter) parts.push(gridAfter);
  const widthBefore = serializeDocxWidthElement(
    "wBefore",
    row.style?.widthBefore,
  );
  if (widthBefore) parts.push(widthBefore);
  const widthAfter = serializeDocxWidthElement("wAfter", row.style?.widthAfter);
  if (widthAfter) parts.push(widthAfter);
  const cellSpacingXml = serializeDocxWidthElement(
    "tblCellSpacing",
    row.style?.cellSpacing,
  );
  if (cellSpacingXml) parts.push(cellSpacingXml);
  const height = serializeTableRowHeight(row);
  if (height) parts.push(height);
  const cantSplit = serializeOnOffElement("cantSplit", row.style?.cantSplit);
  if (cantSplit) parts.push(cantSplit);
  if (row.style?.isHeader ?? row.isHeader) parts.push("<w:tblHeader/>");
  const hidden = serializeOnOffElement("hidden", row.style?.hidden);
  if (hidden) parts.push(hidden);
  if (row.style?.align) parts.push(`<w:jc w:val="${row.style.align}"/>`);
  if (row.style?.propertyRevision) {
    const revision = row.style.propertyRevision;
    parts.push(
      `<w:trPrChange ${serializeRevisionAttrs(revision)}>${serializeTableRowStyleXml(revision.previous)}</w:trPrChange>`,
    );
  }
  if (row.style?.revision && row.style.revision.type !== "merge") {
    const revision = row.style.revision;
    const element = revision.type === "insert" ? "ins" : "del";
    parts.push(`<w:${element} ${serializeRevisionAttrs(revision)}/>`);
  }
  return parts.length > 0 ? `<w:trPr>${parts.join("")}</w:trPr>` : "";
}

function serializeFloatingTableProperties(
  floating: EditorTableFloatingLayout | undefined,
): string {
  if (!floating || Object.keys(floating).length === 0) {
    return "";
  }
  const twips = (value: number | undefined): string | undefined => {
    const converted = pointsToTwips(value);
    return converted === null ? undefined : String(converted);
  };
  const values: Record<string, string | undefined> = {
    horzAnchor: floating.horizontalAnchor,
    vertAnchor: floating.verticalAnchor,
    tblpX: twips(floating.x),
    tblpY: twips(floating.y),
    tblpXSpec: floating.xAlign,
    tblpYSpec: floating.yAlign,
    topFromText: twips(floating.distanceTop),
    rightFromText: twips(floating.distanceRight),
    bottomFromText: twips(floating.distanceBottom),
    leftFromText: twips(floating.distanceLeft),
  };
  const attrs = Object.entries(values)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => `w:${key}="${escapeXml(value)}"`)
    .join(" ");
  return `<w:tblpPr ${attrs}/>`;
}

function serializeTableBorders(style: EditorTableNode["style"]): string {
  const borders = style?.borders;
  if (!borders) return "";
  const edges: Array<[string, EditorBorderStyle | undefined]> = [
    ["top", borders.borderTop],
    ["left", borders.borderLeft],
    ["bottom", borders.borderBottom],
    ["right", borders.borderRight],
    ["insideH", borders.borderInsideH],
    ["insideV", borders.borderInsideV],
  ];
  const xml = edges
    .filter((entry): entry is [string, EditorBorderStyle] => !!entry[1])
    .map(([name, border]) => `<w:${name} ${serializeDocxBorderAttrs(border)}`)
    .join("");
  return xml ? `<w:tblBorders>${xml}</w:tblBorders>` : "";
}

function serializeTableProperties(table: EditorTableNode): string {
  const parts: string[] = [];
  if (table.style?.styleId) {
    parts.push(`<w:tblStyle w:val="${escapeXml(table.style.styleId)}"/>`);
  }
  if (table.style?.tblLook) {
    const l = table.style.tblLook;
    parts.push(
      `<w:tblLook w:firstRow="${l.firstRow ? "1" : "0"}" w:lastRow="${l.lastRow ? "1" : "0"}" w:firstColumn="${l.firstCol ? "1" : "0"}" w:lastColumn="${l.lastCol ? "1" : "0"}" w:noHBand="${l.noHBand ? "1" : "0"}" w:noVBand="${l.noVBand ? "1" : "0"}"/>`,
    );
  }
  if (table.style?.altTitle) {
    parts.push(`<w:tblCaption w:val="${escapeXml(table.style.altTitle)}"/>`);
  }
  if (table.style?.altDescription) {
    parts.push(
      `<w:tblDescription w:val="${escapeXml(table.style.altDescription)}"/>`,
    );
  }
  const floatingXml = serializeFloatingTableProperties(table.style?.floating);
  if (floatingXml) {
    parts.push(floatingXml);
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
  const defaultMarginsXml = serializeTableDefaultCellMargins(
    table.style?.defaultCellMargins,
  );
  if (defaultMarginsXml) {
    parts.push(defaultMarginsXml);
  }
  const tableBorders = serializeTableBorders(table.style);
  if (tableBorders) parts.push(tableBorders);
  const indentXml = serializeDocxWidthElement(
    "tblInd",
    table.style?.indentLeft,
  );
  if (indentXml) {
    parts.push(indentXml);
  }
  parts.push(`<w:tblLayout w:type="${table.style?.layout ?? "fixed"}"/>`);
  const bidiVisual = serializeOnOffElement(
    "bidiVisual",
    table.style?.bidiVisual,
  );
  if (bidiVisual) {
    parts.push(bidiVisual);
  }
  if (table.style?.tblOverlap) {
    parts.push(`<w:tblOverlap w:val="${escapeXml(table.style.tblOverlap)}"/>`);
  }
  if (table.style?.revision) {
    const revision = table.style.revision;
    const previous = serializeTableProperties({
      ...table,
      style: revision.previous,
    });
    parts.push(
      `<w:tblPrChange ${serializeRevisionAttrs(revision)}>${previous}</w:tblPrChange>`,
    );
  }
  return `<w:tblPr>${parts.join("")}</w:tblPr>`;
}

/**
 * Serializes `w:tblPrEx` row-level table property exceptions in CT_TblPrEx child
 * order (tblW < jc < tblCellSpacing < tblInd < tblBorders < tblLayout <
 * tblCellMar). Returns "" when there are no exceptions to emit.
 */
function serializeTablePropertyExceptions(
  exceptions: EditorTableStyle | undefined,
  tblPrExChangeXml?: string,
): string {
  if (!exceptions && !tblPrExChangeXml) {
    return "";
  }
  const parts: string[] = [];
  if (exceptions?.width !== undefined) {
    parts.push(serializeTableWidth(exceptions.width));
  }
  if (exceptions?.align) {
    parts.push(`<w:jc w:val="${exceptions.align}"/>`);
  }
  const cellSpacingXml = serializeDocxWidthElement(
    "tblCellSpacing",
    exceptions?.cellSpacing,
  );
  if (cellSpacingXml) {
    parts.push(cellSpacingXml);
  }
  const indentXml = serializeDocxWidthElement("tblInd", exceptions?.indentLeft);
  if (indentXml) {
    parts.push(indentXml);
  }
  const bordersXml = exceptions ? serializeTableBorders(exceptions) : "";
  if (bordersXml) {
    parts.push(bordersXml);
  }
  if (exceptions?.layout) {
    parts.push(`<w:tblLayout w:type="${exceptions.layout}"/>`);
  }
  const marginsXml = serializeTableDefaultCellMargins(
    exceptions?.defaultCellMargins,
  );
  if (marginsXml) {
    parts.push(marginsXml);
  }
  if (tblPrExChangeXml) {
    parts.push(tblPrExChangeXml);
  }
  return parts.length > 0 ? `<w:tblPrEx>${parts.join("")}</w:tblPrEx>` : "";
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
                    runs: [{ id: "", text: "", kind: "text" as const }],
                  },
                ];
          const paragraphsXml = paragraphs
            .map((paragraph) => serializeParagraphXml(paragraph, cell))
            .join("");
          const contentXml =
            cell.vMerge === "continue" ? "<w:p/>" : paragraphsXml;
          return `<w:tc${serializeExtAttributes(cell.extAttributes)}>${serializeTableCellProperties(cell, fallbackWidthPt)}${contentXml}</w:tc>`;
        })
        .join("");
      return `<w:tr${serializeExtAttributes(row.extAttributes)}>${serializeTablePropertyExceptions(row.propertyExceptions, row.tblPrExChangeXml)}${serializeTableRowProperties(row)}${cellsXml}</w:tr>`;
    })
    .join("");
  const gridXml = table.gridCols
    ? `<w:tblGrid>${table.gridCols
        .map((width) => `<w:gridCol w:w="${pointsToTwips(width) ?? 0}"/>`)
        .join("")}${
        table.gridRevision
          ? `<w:tblGridChange ${serializeRevisionAttrs(table.gridRevision)}><w:tblGrid>${table.gridRevision.previous
              .map((width) => `<w:gridCol w:w="${pointsToTwips(width) ?? 0}"/>`)
              .join("")}</w:tblGrid></w:tblGridChange>`
          : ""
      }</w:tblGrid>`
    : "";
  return `<w:tbl>${serializeTableProperties(table)}${gridXml}${rowsXml}</w:tbl>`;
}
