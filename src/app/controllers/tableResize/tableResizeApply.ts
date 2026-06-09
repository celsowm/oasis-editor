import type { EditorState } from "../../../core/model.js";
import {
  setTableRowHeight,
  setTableColumnWidths,
} from "../../../core/editorCommands.js";
import { parseSizeToPt, pxToPt, MIN_TABLE_SIZE_PT, ptToPx } from "./tableResizeUnits.js";
import { getTableById } from "./tableResizeGeometry.js";
import type { TableResizeState } from "./tableResizeTypes.js";

export function applyRowResize(
  state: EditorState,
  resize: TableResizeState,
  delta: number,
): EditorState {
  if (resize.type !== "row") return state;
  const deltaPt = pxToPt(delta);
  const basePx =
    resize.initialRowHeightPx ?? ptToPx(MIN_TABLE_SIZE_PT);
  const minRowHeightPx = Math.max(
    ptToPx(MIN_TABLE_SIZE_PT),
    resize.minRowHeightPx ?? ptToPx(MIN_TABLE_SIZE_PT),
  );
  const newSizePt = Math.max(
    MIN_TABLE_SIZE_PT,
    pxToPt(Math.max(minRowHeightPx, basePx + delta)),
  );
  return setTableRowHeight(
    state,
    resize.tableId,
    resize.index,
    newSizePt,
  );
}

export function applyColumnResize(
  state: EditorState,
  resize: TableResizeState,
  delta: number,
): EditorState {
  if (resize.type !== "column") return state;
  const deltaPt = pxToPt(delta);

  const maxColumnIndex =
    resize.maxColumnIndex ?? resize.index;
  const baseWidths = { ...(resize.columnWidthsPt ?? {}) };
  for (let i = 0; i <= maxColumnIndex; i += 1) {
    if (baseWidths[i] === undefined) {
      baseWidths[i] = MIN_TABLE_SIZE_PT;
    }
  }

  const minColumnWidthsPx = resize.minColumnWidthsPx ?? {};
  const oldWidth = baseWidths[resize.index] ?? MIN_TABLE_SIZE_PT;
  const minWidthPt = Math.max(
    MIN_TABLE_SIZE_PT,
    pxToPt(
      minColumnWidthsPx[resize.index] ??
        ptToPx(MIN_TABLE_SIZE_PT),
    ),
  );
  if (resize.resizeFromLeftEdge) {
    const initialIndentLeftPt = Math.max(
      0,
      resize.initialTableIndentLeftPt ?? 0,
    );
    let newWidth = Math.max(minWidthPt, oldWidth - deltaPt);
    let appliedDeltaPt = oldWidth - newWidth;

    if (initialIndentLeftPt + appliedDeltaPt < 0) {
      appliedDeltaPt = -initialIndentLeftPt;
      newWidth = oldWidth - appliedDeltaPt;
    }

    baseWidths[resize.index] = newWidth;
    const tableWidthPt = Object.values(baseWidths).reduce(
      (sum, value) => sum + value,
      0,
    );
    const nextIndentLeftPt = Math.max(
      0,
      initialIndentLeftPt + appliedDeltaPt,
    );
    return setTableColumnWidths(
      state,
      resize.tableId,
      baseWidths,
      tableWidthPt,
      nextIndentLeftPt,
    );
  }

  let newWidth = Math.max(minWidthPt, oldWidth + deltaPt);
  const isLastColumn = resize.index === maxColumnIndex;

  if (!isLastColumn) {
    const nextIndex = resize.index + 1;
    const oldNextWidth = baseWidths[nextIndex] ?? MIN_TABLE_SIZE_PT;
    const minNextWidthPt = Math.max(
      MIN_TABLE_SIZE_PT,
      pxToPt(minColumnWidthsPx[nextIndex] ?? ptToPx(MIN_TABLE_SIZE_PT)),
    );
    let newNextWidth = oldNextWidth - (newWidth - oldWidth);

    if (newNextWidth < minNextWidthPt) {
      newNextWidth = minNextWidthPt;
      newWidth = oldWidth + (oldNextWidth - minNextWidthPt);
      newWidth = Math.max(minWidthPt, newWidth);
    }

    baseWidths[resize.index] = newWidth;
    baseWidths[nextIndex] = newNextWidth;
  } else {
    baseWidths[resize.index] = newWidth;
  }

  const tableWidthPt = Object.values(baseWidths).reduce(
    (sum, value) => sum + value,
    0,
  );
  const tableNode = getTableById(state, resize.tableId);
  const currentTableWidthPt = parseSizeToPt(tableNode?.style?.width);
  const tableWidthToPersist = isLastColumn
    ? tableWidthPt
    : currentTableWidthPt !== null
      ? currentTableWidthPt
      : undefined;
  return setTableColumnWidths(
    state,
    resize.tableId,
    baseWidths,
    tableWidthToPersist,
  );
}
