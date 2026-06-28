import type { EditorTableNode } from "@/core/model.js";
import { parseDimensionToPx } from "./tableCellGeometry.js";
import type { PreparedCell } from "./prepareCells.js";

const DEFAULT_TABLE_ROW_HEIGHT = 14;

export function resolveRowHeights(options: {
  prepared: PreparedCell[];
  table: EditorTableNode;
  effectiveRowStyles: (EditorTableNode["rows"][number]["style"])[];
  estimatedHeight: number;
}): number[] {
  const { prepared, table, effectiveRowStyles, estimatedHeight } = options;
  const rowCount = Math.max(1, table.rows.length);

  const explicitRowHeights = table.rows.map((row, rowIndex) => {
    const effective = effectiveRowStyles[rowIndex];
    if (effective?.hidden || effective?.revision?.type === "delete") return 0;
    const explicit = parseDimensionToPx(effective?.height);
    return explicit !== null && explicit > 0 ? explicit : null;
  });

  const fallbackPerRow =
    estimatedHeight > 0 ? estimatedHeight / rowCount : DEFAULT_TABLE_ROW_HEIGHT;

  const rowHeights: number[] = [];
  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    if (
      effectiveRowStyles[rowIndex]?.hidden ||
      effectiveRowStyles[rowIndex]?.revision?.type === "delete"
    ) {
      rowHeights[rowIndex] = 0;
      continue;
    }
    let measured = 0;
    for (const cellEntry of prepared) {
      if (cellEntry.rowIndex !== rowIndex) continue;
      const needed =
        cellEntry.contentNaturalHeightPx +
        cellEntry.padding.top +
        cellEntry.padding.bottom +
        cellEntry.borders.top.width +
        cellEntry.borders.bottom.width;
      const distributed =
        cellEntry.rowSpan > 1 ? needed / cellEntry.rowSpan : needed;
      if (distributed > measured) measured = distributed;
    }
    const explicit = explicitRowHeights[rowIndex];
    const baseFloor =
      explicit !== null ? explicit : Math.max(1, fallbackPerRow * 0.25);
    rowHeights[rowIndex] = Math.max(baseFloor, measured, 1);
  }

  return rowHeights;
}
