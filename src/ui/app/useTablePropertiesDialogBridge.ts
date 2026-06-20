import {
  setActiveTableStyleValue,
  setSelectedTableRowHeader,
  setSelectedTableRowStyleValue,
  setTableCellStyleValue,
  setTableColumnWidths,
} from "@/core/commands/table.js";
import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  getActiveZone,
  getDocumentSections,
  type EditorBorderStyle,
  type EditorDocxWidthValue,
  type EditorState,
  type EditorTableCellStyle,
  type EditorTableNode,
} from "@/core/model.js";
import { buildTableCellLayout } from "@/core/tableLayout.js";
import type {
  TablePropertiesDialogApplyValues,
  TablePropertiesDialogInitialValues,
} from "@/ui/components/Dialogs/TablePropertiesDialog.js";

interface TablePropertiesDialogState {
  isOpen: boolean;
  initial: TablePropertiesDialogInitialValues;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

export interface TablePropertiesDialogBridgeDeps {
  state: () => EditorState;
  isReadOnly: () => boolean;
  setTablePropertiesDialog: (state: TablePropertiesDialogState) => void;
  setContextMenu: (state: ContextMenuState) => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: string },
  ) => void;
  focusInput: () => void;
}

interface ActiveTableContext {
  table: EditorTableNode;
  tableId: string;
  rowIndex: number;
  cellIndex: number;
  visualColumnIndex: number;
}

const EMPTY_INITIAL: TablePropertiesDialogInitialValues = {
  activeTab: "table",
  tableWidth: "",
  tableWidthUnit: "points",
  tableAlign: "",
  tableIndentLeft: "",
  tableWrapping: "none",
  floatingSummary: "",
  rowHeight: "",
  rowHeightRule: "",
  repeatHeader: false,
  allowBreakAcrossPages: true,
  hiddenRow: false,
  columnWidth: "",
  cellWidth: "",
  cellVerticalAlign: "",
  cellTextDirection: "",
  cellNoWrap: false,
  cellFitText: false,
  cellHideMark: false,
  marginTop: "",
  marginRight: "",
  marginBottom: "",
  marginLeft: "",
  borderStyle: "none",
  borderWidth: "",
  borderColor: "",
  borderTop: false,
  borderRight: false,
  borderBottom: false,
  borderLeft: false,
  shading: "",
  altTitle: "",
  altDescription: "",
};

function getZoneBlocks(
  state: EditorState,
  zone: ReturnType<typeof getActiveZone>,
) {
  const section = getDocumentSections(state.document)[
    getActiveSectionIndex(state)
  ];
  if (!section) return [];
  if (zone === "header") return section.header ?? [];
  if (zone === "footer") return section.footer ?? [];
  return section.blocks;
}

function resolveActiveTableContext(
  state: EditorState,
): ActiveTableContext | null {
  const activeSectionIndex = getActiveSectionIndex(state);
  const loc = findParagraphTableLocation(
    state.document,
    state.selection.focus.paragraphId,
    activeSectionIndex,
  );
  if (!loc) return null;
  const table = getZoneBlocks(state, loc.zone)[loc.blockIndex];
  if (!table || table.type !== "table") return null;
  const entry = buildTableCellLayout(table).find(
    (candidate) =>
      candidate.rowIndex === loc.rowIndex &&
      candidate.cellIndex === loc.cellIndex,
  );
  return {
    table,
    tableId: table.id,
    rowIndex: loc.rowIndex,
    cellIndex: loc.cellIndex,
    visualColumnIndex: entry?.visualColumnIndex ?? loc.cellIndex,
  };
}

function serializeWidth(value: EditorDocxWidthValue | undefined): {
  value: string;
  unit: "points" | "percent";
} {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { value: String(value), unit: "points" };
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.endsWith("%")) {
      return { value: trimmed.slice(0, -1), unit: "percent" };
    }
    const numeric = trimmed.match(/^([0-9.]+)(pt)?$/i);
    if (numeric?.[1]) return { value: numeric[1], unit: "points" };
  }
  return { value: "", unit: "points" };
}

function isVisibleBorder(border: EditorBorderStyle | undefined): boolean {
  return !!border && border.type !== "none" && border.width > 0;
}

function buildFloatingSummary(table: EditorTableNode): string {
  const floating = table.style?.floating;
  if (!floating || Object.keys(floating).length === 0) return "";
  return Object.entries(floating)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

function buildInitialValues(
  ctx: ActiveTableContext,
  activeTab: TablePropertiesDialogInitialValues["activeTab"] = "table",
): TablePropertiesDialogInitialValues {
  const tableWidth = serializeWidth(ctx.table.style?.width);
  const row = ctx.table.rows[ctx.rowIndex];
  const cell = row?.cells[ctx.cellIndex];
  const rowHeight = serializeWidth(row?.style?.height);
  const cellWidth = serializeWidth(cell?.style?.width);
  const gridWidth = ctx.table.gridCols?.[ctx.visualColumnIndex];
  const columnWidth = serializeWidth(gridWidth);
  const style = cell?.style ?? {};
  const candidateBorders = [
    style.borderTop,
    style.borderRight,
    style.borderBottom,
    style.borderLeft,
  ].filter(isVisibleBorder);
  const sharedBorder = candidateBorders[0];
  const floatingSummary = buildFloatingSummary(ctx.table);

  return {
    ...EMPTY_INITIAL,
    activeTab,
    tableWidth: tableWidth.value,
    tableWidthUnit: tableWidth.unit,
    tableAlign: ctx.table.style?.align ?? "",
    tableIndentLeft: serializeWidth(ctx.table.style?.indentLeft).value,
    tableWrapping: floatingSummary ? "around" : "none",
    floatingSummary,
    rowHeight: rowHeight.value,
    rowHeightRule: row?.style?.heightRule ?? "",
    repeatHeader: Boolean(row?.isHeader),
    allowBreakAcrossPages: row?.style?.cantSplit !== true,
    hiddenRow: row?.style?.hidden === true,
    columnWidth: columnWidth.value,
    cellWidth: cellWidth.value,
    cellVerticalAlign: style.verticalAlign ?? "",
    cellTextDirection: style.textDirection ?? "",
    cellNoWrap: style.noWrap === true,
    cellFitText: style.fitText === true,
    cellHideMark: style.hideMark === true,
    marginTop: style.paddingTop != null ? String(style.paddingTop) : "",
    marginRight: style.paddingRight != null ? String(style.paddingRight) : "",
    marginBottom:
      style.paddingBottom != null ? String(style.paddingBottom) : "",
    marginLeft: style.paddingLeft != null ? String(style.paddingLeft) : "",
    borderStyle: sharedBorder?.type ?? "none",
    borderWidth: sharedBorder ? String(sharedBorder.width) : "",
    borderColor: sharedBorder?.color ?? "",
    borderTop: isVisibleBorder(style.borderTop),
    borderRight: isVisibleBorder(style.borderRight),
    borderBottom: isVisibleBorder(style.borderBottom),
    borderLeft: isVisibleBorder(style.borderLeft),
    shading: style.shading ?? "",
    altTitle: ctx.table.style?.altTitle ?? "",
    altDescription: ctx.table.style?.altDescription ?? "",
  };
}

function setCellStyle<K extends keyof EditorTableCellStyle>(
  state: EditorState,
  key: K,
  value: EditorTableCellStyle[K] | null,
): EditorState {
  return setTableCellStyleValue(state, key, value);
}

export function createTablePropertiesDialogBridge(
  deps: TablePropertiesDialogBridgeDeps,
) {
  const isInsideTable = () => Boolean(resolveActiveTableContext(deps.state()));

  const openTablePropertiesDialog = (
    activeTab: TablePropertiesDialogInitialValues["activeTab"] = "table",
  ) => {
    const ctx = resolveActiveTableContext(deps.state());
    if (!ctx) return;
    deps.setContextMenu({ isOpen: false, x: 0, y: 0 });
    deps.setTablePropertiesDialog({
      isOpen: true,
      initial: buildInitialValues(ctx, activeTab),
    });
  };

  const applyTablePropertiesDialogValues = (
    values: TablePropertiesDialogApplyValues,
  ) => {
    if (deps.isReadOnly()) return;
    const ctx = resolveActiveTableContext(deps.state());
    if (!ctx) return;
    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();
    deps.applyTransactionalState(
      (current) => {
        const currentCtx = resolveActiveTableContext(current);
        if (!currentCtx) return current;
        let next = current;
        next = setActiveTableStyleValue(
          next,
          currentCtx.tableId,
          "width",
          values.tableWidth,
        );
        next = setActiveTableStyleValue(
          next,
          currentCtx.tableId,
          "align",
          values.tableAlign,
        );
        next = setActiveTableStyleValue(
          next,
          currentCtx.tableId,
          "indentLeft",
          values.tableIndentLeft,
        );
        next = setActiveTableStyleValue(
          next,
          currentCtx.tableId,
          "altTitle",
          values.altTitle,
        );
        next = setActiveTableStyleValue(
          next,
          currentCtx.tableId,
          "altDescription",
          values.altDescription,
        );
        next = setSelectedTableRowHeader(next, values.repeatHeader);
        next = setSelectedTableRowStyleValue(next, "height", values.rowHeight);
        next = setSelectedTableRowStyleValue(
          next,
          "heightRule",
          values.rowHeightRule,
        );
        next = setSelectedTableRowStyleValue(
          next,
          "cantSplit",
          values.cantSplit,
        );
        next = setSelectedTableRowStyleValue(next, "hidden", values.hiddenRow);
        if (values.columnWidth !== null) {
          next = setTableColumnWidths(next, currentCtx.tableId, {
            [currentCtx.visualColumnIndex]: values.columnWidth,
          });
        }
        next = setCellStyle(next, "width", values.cellWidth);
        next = setCellStyle(next, "verticalAlign", values.cellVerticalAlign);
        next = setCellStyle(next, "textDirection", values.cellTextDirection);
        next = setCellStyle(next, "noWrap", values.cellNoWrap);
        next = setCellStyle(next, "fitText", values.cellFitText);
        next = setCellStyle(next, "hideMark", values.cellHideMark);
        next = setCellStyle(next, "paddingTop", values.margins.top);
        next = setCellStyle(next, "paddingRight", values.margins.right);
        next = setCellStyle(next, "paddingBottom", values.margins.bottom);
        next = setCellStyle(next, "paddingLeft", values.margins.left);
        next = setCellStyle(next, "borderTop", values.borders.top);
        next = setCellStyle(next, "borderRight", values.borders.right);
        next = setCellStyle(next, "borderBottom", values.borders.bottom);
        next = setCellStyle(next, "borderLeft", values.borders.left);
        next = setCellStyle(next, "shading", values.shading);
        return next;
      },
      { mergeKey: "tableProperties" },
    );
    deps.focusInput();
  };

  return {
    isInsideTable,
    openTablePropertiesDialog,
    applyTablePropertiesDialogValues,
  };
}
