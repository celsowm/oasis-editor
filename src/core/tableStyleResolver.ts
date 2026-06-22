import type {
  EditorNamedStyle,
  EditorParagraphStyle,
  EditorTableCellStyle,
  EditorTableConditionalFlags,
  EditorTableConditionalFormat,
  EditorTableNode,
  EditorTableRowStyle,
  EditorTableStyle,
  EditorTextStyle,
} from "./model.js";
import {
  resolveDefaultParagraphStyleId,
  resolveNamedParagraphStyle,
} from "./model/styleResolution.js";

export interface ResolvedTableCellFormatting {
  tableStyle: EditorTableStyle;
  rowStyle: EditorTableRowStyle;
  cellStyle: EditorTableCellStyle;
  paragraphStyle?: EditorParagraphStyle;
  textStyle?: EditorTextStyle;
  conditionalKeys: string[];
}

export function resolveEffectiveTableStyle(
  table: EditorTableNode,
  styles?: Record<string, EditorNamedStyle>,
): EditorTableStyle {
  const named = resolveNamedTableStyle(table.style?.styleId, styles);
  return mergeTableStyles(named.tableStyle, table.style);
}

export function resolveTableParagraphInheritance(
  tableStyle: EditorParagraphStyle | undefined,
  paragraphStyleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
): EditorParagraphStyle | undefined {
  if (!tableStyle) return undefined;
  const effectiveStyleId =
    paragraphStyleId ?? resolveDefaultParagraphStyleId(styles);
  const named = resolveNamedParagraphStyle(effectiveStyleId, styles);
  const inherited: EditorParagraphStyle = {};
  for (const [key, value] of Object.entries(tableStyle)) {
    if (!(key in named)) {
      (inherited as Record<string, unknown>)[key] = value;
    }
  }
  return Object.keys(inherited).length > 0 ? inherited : undefined;
}

function mergeTableStyles(
  base: EditorTableStyle | undefined,
  next: EditorTableStyle | undefined,
): EditorTableStyle {
  const conditionalFormats: Record<string, EditorTableConditionalFormat> = {
    ...(base?.conditionalFormats ?? {}),
  };
  for (const [key, incoming] of Object.entries(
    next?.conditionalFormats ?? {},
  )) {
    const previous = conditionalFormats[key];
    conditionalFormats[key] = {
      ...(previous ?? {}),
      ...incoming,
      textStyle: { ...previous?.textStyle, ...incoming.textStyle },
      paragraphStyle: {
        ...previous?.paragraphStyle,
        ...incoming.paragraphStyle,
      },
      rowStyle: { ...previous?.rowStyle, ...incoming.rowStyle },
      cellStyle: { ...previous?.cellStyle, ...incoming.cellStyle },
      borders: { ...previous?.borders, ...incoming.borders },
      tableStyle: mergeTableStyles(previous?.tableStyle, incoming.tableStyle),
    };
  }
  return {
    ...(base ?? {}),
    ...(next ?? {}),
    defaultCellMargins: {
      ...(base?.defaultCellMargins ?? {}),
      ...(next?.defaultCellMargins ?? {}),
    },
    borders: { ...(base?.borders ?? {}), ...(next?.borders ?? {}) },
    ...(Object.keys(conditionalFormats).length > 0
      ? { conditionalFormats }
      : {}),
  };
}

function resolveNamedTableStyle(
  styleId: string | undefined,
  styles: Record<string, EditorNamedStyle> | undefined,
  seen = new Set<string>(),
): {
  tableStyle: EditorTableStyle;
  paragraphStyle?: EditorParagraphStyle;
  textStyle?: EditorTextStyle;
} {
  if (!styles) return { tableStyle: {} };
  const effectiveId =
    styleId ??
    Object.values(styles).find(
      (style) => style.type === "table" && style.isDefault,
    )?.id;
  if (!effectiveId || seen.has(effectiveId)) return { tableStyle: {} };
  const named = styles[effectiveId];
  if (!named || named.type !== "table") return { tableStyle: {} };
  seen.add(effectiveId);
  const parent = resolveNamedTableStyle(named.basedOn, styles, seen);
  return {
    tableStyle: mergeTableStyles(parent.tableStyle, named.tableStyle),
    paragraphStyle: {
      ...(parent.paragraphStyle ?? {}),
      ...(named.paragraphStyle ?? {}),
    },
    textStyle: {
      ...(parent.textStyle ?? {}),
      ...(named.textStyle ?? {}),
    },
  };
}

function conditionalKeys(options: {
  rowIndex: number;
  columnIndex: number;
  rowCount: number;
  columnCount: number;
  tableStyle: EditorTableStyle;
  rowFlags?: EditorTableConditionalFlags;
  cellFlags?: EditorTableConditionalFlags;
}): string[] {
  const { rowIndex, columnIndex, rowCount, columnCount, tableStyle } = options;
  const look = tableStyle.tblLook ?? {
    firstRow: true,
    lastRow: false,
    firstCol: true,
    lastCol: false,
    noHBand: false,
    noVBand: false,
  };
  const firstRow = look.firstRow && rowIndex === 0;
  const lastRow = look.lastRow && rowIndex === rowCount - 1 && rowIndex !== 0;
  const firstCol = look.firstCol && columnIndex === 0;
  const lastCol =
    look.lastCol && columnIndex === columnCount - 1 && columnIndex !== 0;
  const keys = ["wholeTable"];
  if (!look.noHBand && !firstRow && !lastRow) {
    const body = rowIndex - (look.firstRow ? 1 : 0);
    keys.push(
      Math.floor(body / Math.max(1, tableStyle.rowBandSize ?? 1)) % 2 === 0
        ? "band1Horz"
        : "band2Horz",
    );
  }
  if (!look.noVBand && !firstCol && !lastCol) {
    const body = columnIndex - (look.firstCol ? 1 : 0);
    keys.push(
      Math.floor(body / Math.max(1, tableStyle.colBandSize ?? 1)) % 2 === 0
        ? "band1Vert"
        : "band2Vert",
    );
  }
  if (lastCol) keys.push("lastCol");
  if (firstCol) keys.push("firstCol");
  if (lastRow) keys.push("lastRow");
  if (firstRow) keys.push("firstRow");
  if (firstRow && firstCol) keys.push("nwCell");
  if (firstRow && lastCol) keys.push("neCell");
  if (lastRow && firstCol) keys.push("swCell");
  if (lastRow && lastCol) keys.push("seCell");
  for (const flags of [options.rowFlags, options.cellFlags]) {
    for (const [key, enabled] of Object.entries(flags ?? {})) {
      if (enabled && !keys.includes(key)) keys.push(key);
      if (enabled === false) {
        const index = keys.indexOf(key);
        if (index >= 0) keys.splice(index, 1);
      }
    }
  }
  return keys;
}

function mergeConditionals(
  keys: string[],
  formats: Record<string, EditorTableConditionalFormat> | undefined,
): EditorTableConditionalFormat {
  const merged: EditorTableConditionalFormat = {};
  for (const key of keys) {
    const next = formats?.[key];
    if (!next) continue;
    if (next.shading) merged.shading = next.shading;
    if (next.textStyle)
      merged.textStyle = { ...merged.textStyle, ...next.textStyle };
    if (next.paragraphStyle)
      merged.paragraphStyle = {
        ...merged.paragraphStyle,
        ...next.paragraphStyle,
      };
    if (next.rowStyle)
      merged.rowStyle = { ...merged.rowStyle, ...next.rowStyle };
    if (next.cellStyle)
      merged.cellStyle = { ...merged.cellStyle, ...next.cellStyle };
    if (next.borders) merged.borders = { ...merged.borders, ...next.borders };
    if (next.tableStyle)
      merged.tableStyle = mergeTableStyles(merged.tableStyle, next.tableStyle);
  }
  return merged;
}

export function resolveEffectiveTableCellFormatting(options: {
  table: EditorTableNode;
  rowIndex: number;
  cellIndex: number;
  visualColumnIndex: number;
  columnCount: number;
  styles?: Record<string, EditorNamedStyle>;
}): ResolvedTableCellFormatting {
  const { table, rowIndex, cellIndex, visualColumnIndex, columnCount, styles } =
    options;
  const named = resolveNamedTableStyle(table.style?.styleId, styles);
  const baseTableStyle = mergeTableStyles(named.tableStyle, table.style);
  const row = table.rows[rowIndex];
  const cell = row?.cells[cellIndex];
  const keys = conditionalKeys({
    rowIndex,
    columnIndex: visualColumnIndex,
    rowCount: table.rows.length,
    columnCount,
    tableStyle: baseTableStyle,
    rowFlags: row?.conditionalStyle,
    cellFlags: cell?.conditionalStyle,
  });
  const conditional = mergeConditionals(
    keys,
    baseTableStyle.conditionalFormats,
  );
  const conditionalCell = {
    ...(baseTableStyle.defaultCellMargins?.top !== undefined
      ? { paddingTop: baseTableStyle.defaultCellMargins.top }
      : {}),
    ...(baseTableStyle.defaultCellMargins?.right !== undefined
      ? { paddingRight: baseTableStyle.defaultCellMargins.right }
      : {}),
    ...(baseTableStyle.defaultCellMargins?.bottom !== undefined
      ? { paddingBottom: baseTableStyle.defaultCellMargins.bottom }
      : {}),
    ...(baseTableStyle.defaultCellMargins?.left !== undefined
      ? { paddingLeft: baseTableStyle.defaultCellMargins.left }
      : {}),
    ...(baseTableStyle.defaultCellMargins?.start !== undefined
      ? { paddingStart: baseTableStyle.defaultCellMargins.start }
      : {}),
    ...(baseTableStyle.defaultCellMargins?.end !== undefined
      ? { paddingEnd: baseTableStyle.defaultCellMargins.end }
      : {}),
    ...(rowIndex === 0 && baseTableStyle.borders?.borderTop
      ? { borderTop: baseTableStyle.borders.borderTop }
      : rowIndex > 0 && baseTableStyle.borders?.borderInsideH
        ? { borderTop: baseTableStyle.borders.borderInsideH }
        : {}),
    ...(rowIndex === table.rows.length - 1 &&
    baseTableStyle.borders?.borderBottom
      ? { borderBottom: baseTableStyle.borders.borderBottom }
      : rowIndex < table.rows.length - 1 &&
          baseTableStyle.borders?.borderInsideH
        ? { borderBottom: baseTableStyle.borders.borderInsideH }
        : {}),
    ...(visualColumnIndex === 0 && baseTableStyle.borders?.borderLeft
      ? { borderLeft: baseTableStyle.borders.borderLeft }
      : visualColumnIndex > 0 && baseTableStyle.borders?.borderInsideV
        ? { borderLeft: baseTableStyle.borders.borderInsideV }
        : {}),
    ...(visualColumnIndex === columnCount - 1 &&
    baseTableStyle.borders?.borderRight
      ? { borderRight: baseTableStyle.borders.borderRight }
      : visualColumnIndex < columnCount - 1 &&
          baseTableStyle.borders?.borderInsideV
        ? { borderRight: baseTableStyle.borders.borderInsideV }
        : {}),
    ...(conditional.cellStyle ?? {}),
    ...(conditional.borders ?? {}),
    ...(conditional.shading ? { shading: conditional.shading } : {}),
  };
  return {
    tableStyle: mergeTableStyles(baseTableStyle, conditional.tableStyle),
    rowStyle: { ...(conditional.rowStyle ?? {}), ...(row?.style ?? {}) },
    cellStyle: { ...conditionalCell, ...(cell?.style ?? {}) },
    paragraphStyle: {
      ...(named.paragraphStyle ?? {}),
      ...(conditional.paragraphStyle ?? {}),
    },
    textStyle: {
      ...(named.textStyle ?? {}),
      ...(conditional.textStyle ?? {}),
    },
    conditionalKeys: keys,
  };
}
