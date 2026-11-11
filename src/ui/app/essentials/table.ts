import { MERGE_KEYS, type MergeKey } from "@/core/transactionMergeKeys.js";
import {
  distributeSelectedTableColumns,
  distributeSelectedTableRows,
  applyTableBorderPreset,
  setTableCellBorders,
  setTableCellAlignment,
  getTableCellAlignmentState,
  setTableCellStyleValue,
  setTableCellWidth,
  setTableCellNoWrap,
  setTableCellFitText,
  setTableStyleValue,
  canConvertActiveTableToText,
  convertActiveTableToText,
  canConvertActiveTextToTable,
  convertActiveTextToTable,
  canSplitActiveTableAtRow,
  splitActiveTableAtRow,
  canSortActiveTable,
  sortActiveTable,
  canDeleteActiveTable,
  deleteActiveTable,
  canToggleRepeatHeaderRows,
  isRepeatHeaderRowsActive,
  toggleRepeatHeaderRows,
  canSetTableCellMargins,
  setActiveTableCellMargins,
  type TableCellMargins,
  type TableCellAlignment,
  canSetActiveTableCellSpacing,
  setActiveTableCellSpacing,
  canSetActiveTableIndent,
  setActiveTableIndent,
  canSetActiveTableAlignment,
  setActiveTableAlignment,
  canEvaluateActiveTableFormula,
  evaluateActiveTableFormula,
  canSelectActiveTable,
  selectActiveTable,
  type TableSelectionKind,
  canSetActiveTableRowHeight,
  setActiveTableRowHeight,
  type TableRowHeight,
  canSetActiveTableRowBreakAcrossPages,
  setActiveTableRowBreakAcrossPages,
  canSetActiveTableRowHeader,
  setSelectedTableRowHeader,
  canSetActiveTableColumnWidth,
  setActiveTableColumnWidth,
  canSetActiveTableWidth,
  setActiveTableWidth,
  canDeleteActiveTableCell,
  deleteActiveTableCell,
  canSetActiveTableAutoFit,
  setActiveTableAutoFit,
} from "@/core/commands/table.js";
import {
  findParagraphTablePathLocation,
  getActiveSectionIndex,
  getDocumentSections,
  resolveEffectiveTableStyle,
  resolveTablePath,
  type EditorBlockNode,
  type EditorState,
  type EditorTableNode,
  type TablePathSegment,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import type {
  EssentialsTableCapability,
  TableLookState,
} from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

function pathsIdentifySameTable(
  left: readonly TablePathSegment[],
  right: readonly TablePathSegment[],
): boolean {
  if (left.length === 0 || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const leftSegment = left[index]!;
    const rightSegment = right[index]!;
    if (leftSegment.tableBlockIndex !== rightSegment.tableBlockIndex) {
      return false;
    }
    if (
      index < left.length - 1 &&
      (leftSegment.rowIndex !== rightSegment.rowIndex ||
        leftSegment.cellIndex !== rightSegment.cellIndex)
    ) {
      return false;
    }
  }
  return true;
}

function zoneBlocks(
  state: EditorState,
  sectionIndex: number,
  zone: "main" | "header" | "footer" | "footnote",
): EditorBlockNode[] | null {
  if (zone === "footnote") {
    const footnoteId = state.activeFootnoteId;
    return footnoteId
      ? (state.document.footnotes?.items[footnoteId]?.blocks ?? null)
      : null;
  }
  const section = getDocumentSections(state.document)[sectionIndex];
  if (!section) return null;
  if (zone === "header") return section.header ?? [];
  if (zone === "footer") return section.footer ?? [];
  return section.blocks;
}

export function buildEssentialsTable(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsTableCapability {
  let drawingBorders = false;
  let showingGridlines = false;
  const insideTable = (): boolean =>
    Boolean(
      findParagraphTablePathLocation(
        options.state().document,
        options.state().selection.focus.paragraphId,
        getActiveSectionIndex(options.state()),
      ),
    );
  const apply = (
    producer: (current: EditorState) => EditorState,
    mergeKey: MergeKey,
  ): void => {
    options.applyTransactionalState(producer, { mergeKey });
    options.focusInput();
  };
  const RAW_TBL_LOOK_DEFAULTS = {
    firstRow: false,
    lastRow: false,
    firstCol: false,
    lastCol: false,
    noHBand: false,
    noVBand: false,
  };
  const selectedTableIn = (state: EditorState): EditorTableNode | null => {
    const sectionIndex = getActiveSectionIndex(state);
    const location = findParagraphTablePathLocation(
      state.document,
      state.selection.focus.paragraphId,
      sectionIndex,
    );
    if (!location) return null;
    const blocks = zoneBlocks(state, sectionIndex, location.zone);
    if (!blocks) return null;
    const resolved = resolveTablePath(blocks, location.tablePath);
    return resolved?.[resolved.length - 1]?.table ?? null;
  };
  const rawTblLookIn = (
    state: EditorState,
  ): typeof RAW_TBL_LOOK_DEFAULTS | null => {
    const table = selectedTableIn(state);
    if (!table) return null;
    const effective = resolveEffectiveTableStyle(table, state.document.styles);
    return { ...RAW_TBL_LOOK_DEFAULTS, ...(effective.tblLook ?? {}) };
  };
  const selectionLabel = (): string | null => {
    const state = options.state();
    const normalized = normalizeSelection(state);
    if (normalized.isCollapsed) return null;
    const sectionIndex = getActiveSectionIndex(state);
    const anchorLoc = findParagraphTablePathLocation(
      state.document,
      state.selection.anchor.paragraphId,
      sectionIndex,
    );
    const focusLoc = findParagraphTablePathLocation(
      state.document,
      state.selection.focus.paragraphId,
      sectionIndex,
    );
    const anchorSegment = anchorLoc?.tablePath[anchorLoc.tablePath.length - 1];
    const focusSegment = focusLoc?.tablePath[focusLoc.tablePath.length - 1];
    if (
      !anchorLoc ||
      !focusLoc ||
      !anchorSegment ||
      !focusSegment ||
      anchorLoc.zone !== focusLoc.zone ||
      !pathsIdentifySameTable(anchorLoc.tablePath, focusLoc.tablePath) ||
      (anchorSegment.rowIndex === focusSegment.rowIndex &&
        anchorSegment.cellIndex === focusSegment.cellIndex)
    ) {
      return null;
    }
    const count = options.selectionBoxes().length;
    if (count === 0) return null;
    return `Table selection: ${count} cell${count === 1 ? "" : "s"}`;
  };
  return {
    insideTable,
    selectionLabel,
    getTblLook: (): TableLookState | null => {
      const raw = rawTblLookIn(options.state());
      if (!raw) return null;
      return {
        firstRow: raw.firstRow,
        lastRow: raw.lastRow,
        firstCol: raw.firstCol,
        lastCol: raw.lastCol,
        bandedRows: !raw.noHBand,
        bandedCols: !raw.noVBand,
      };
    },
    toggleTblLook: (flag): void =>
      apply((current): EditorState => {
        const raw = rawTblLookIn(current);
        if (!raw) return current;
        const next = { ...raw };
        switch (flag) {
          case "firstRow":
            next.firstRow = !raw.firstRow;
            break;
          case "lastRow":
            next.lastRow = !raw.lastRow;
            break;
          case "firstCol":
            next.firstCol = !raw.firstCol;
            break;
          case "lastCol":
            next.lastCol = !raw.lastCol;
            break;
          case "bandedRows":
            next.noHBand = !raw.noHBand;
            break;
          case "bandedCols":
            next.noVBand = !raw.noVBand;
            break;
        }
        return setTableStyleValue(current, "tblLook", next);
      }, MERGE_KEYS.tableStyleOptions),
    getStyleId: () => selectedTableIn(options.state())?.style?.styleId ?? null,
    setStyleId: (styleId: string): void =>
      apply(
        (current): EditorState =>
          setTableStyleValue(current, "styleId", styleId || null),
        MERGE_KEYS.tableStyleGallery,
      ),
    getLayout: () => selectedTableIn(options.state())?.style?.layout ?? null,
    toggleAutoFit: (): void =>
      apply((current): EditorState => {
        const table = selectedTableIn(current);
        const nextLayout =
          table?.style?.layout === "autofit" ? "fixed" : "autofit";
        return setTableStyleValue(current, "layout", nextLayout);
      }, MERGE_KEYS.tableDistribute),
    canSetAutoFit: (): boolean => canSetActiveTableAutoFit(options.state()),
    setAutoFit: (mode: "contents" | "window" | "fixed"): void =>
      apply(
        (current): EditorState => setActiveTableAutoFit(current, mode),
        MERGE_KEYS.tableAutoFit,
      ),
    distributeColumns: (): void =>
      apply(
        (current): EditorState => distributeSelectedTableColumns(current),
        MERGE_KEYS.tableDistribute,
      ),
    distributeRows: (): void =>
      apply(
        (current): EditorState => distributeSelectedTableRows(current),
        MERGE_KEYS.tableDistribute,
      ),
    canMerge: (): boolean =>
      options.tableOps.canMergeSelectedTable(options.state()),
    canSplit: (): boolean =>
      options.tableOps.canSplitSelectedTable(options.state()),
    canEditColumn: (): boolean =>
      options.tableOps.canEditSelectedTableColumn(options.state()),
    canEditRow: (): boolean =>
      options.tableOps.canEditSelectedTableRow(options.state()),
    canConvertToText: (): boolean =>
      canConvertActiveTableToText(options.state()),
    convertToText: (): void =>
      apply(
        (current): EditorState => convertActiveTableToText(current),
        MERGE_KEYS.tableToText,
      ),
    canConvertToTable: (): boolean =>
      canConvertActiveTextToTable(options.state()),
    convertToTable: (): void =>
      apply(
        (current): EditorState => convertActiveTextToTable(current),
        MERGE_KEYS.textToTable,
      ),
    canSplitTableAtRow: (): boolean =>
      canSplitActiveTableAtRow(options.state()),
    splitTableAtRow: (): void =>
      apply(
        (current): EditorState => splitActiveTableAtRow(current),
        MERGE_KEYS.tableSplitAtRow,
      ),
    canSortTable: (): boolean => canSortActiveTable(options.state()),
    sortTable: (direction: "ascending" | "descending"): void =>
      apply(
        (current): EditorState => sortActiveTable(current, direction),
        direction === "ascending"
          ? MERGE_KEYS.tableSortAscending
          : MERGE_KEYS.tableSortDescending,
      ),
    canDeleteTable: (): boolean => canDeleteActiveTable(options.state()),
    deleteTable: (): void =>
      apply(
        (current): EditorState => deleteActiveTable(current),
        MERGE_KEYS.tableDelete,
      ),
    canToggleRepeatHeaderRows: (): boolean =>
      canToggleRepeatHeaderRows(options.state()),
    isRepeatHeaderRowsActive: (): boolean =>
      isRepeatHeaderRowsActive(options.state()),
    toggleRepeatHeaderRows: (): void =>
      apply(
        (current): EditorState => toggleRepeatHeaderRows(current),
        MERGE_KEYS.tableRepeatHeaderRows,
      ),
    merge: (): void =>
      apply(
        (current): EditorState => options.tableOps.mergeSelectedTable(current),
        MERGE_KEYS.mergeTable,
      ),
    split: (): void =>
      apply(
        (current): EditorState => options.tableOps.splitSelectedTable(current),
        MERGE_KEYS.splitTable,
      ),
    insertColumnBefore: (): void =>
      apply(
        (current): EditorState =>
          options.tableOps.insertSelectedTableColumn(current, -1),
        MERGE_KEYS.insertTableColumn,
      ),
    insertColumnAfter: (): void =>
      apply(
        (current): EditorState =>
          options.tableOps.insertSelectedTableColumn(current, 1),
        MERGE_KEYS.insertTableColumn,
      ),
    deleteColumn: (): void =>
      apply(
        (current): EditorState =>
          options.tableOps.deleteSelectedTableColumn(current),
        MERGE_KEYS.deleteTableColumn,
      ),
    insertRowBefore: (): void =>
      apply(
        (current): EditorState =>
          options.tableOps.insertSelectedTableRow(current, -1),
        MERGE_KEYS.insertTableRow,
      ),
    insertRowAfter: (): void =>
      apply(
        (current): EditorState =>
          options.tableOps.insertSelectedTableRow(current, 1),
        MERGE_KEYS.insertTableRow,
      ),
    deleteRow: (): void =>
      apply(
        (current): EditorState =>
          options.tableOps.deleteSelectedTableRow(current),
        MERGE_KEYS.deleteTableRow,
      ),
    canDeleteCell: (): boolean => canDeleteActiveTableCell(options.state()),
    deleteCell: (): void =>
      apply(
        (current): EditorState => deleteActiveTableCell(current),
        MERGE_KEYS.deleteTableCell,
      ),
    cellShading: (color: string | null): void =>
      apply(
        (current): EditorState =>
          setTableCellStyleValue(current, "shading", color || null),
        MERGE_KEYS.tableShading,
      ),
    cellBorders: (): void =>
      apply(
        (current): EditorState =>
          setTableCellBorders(current, {
            width: 1,
            type: "solid",
            color: "#64748b",
          }),
        MERGE_KEYS.tableBorders,
      ),
    cellNoBorders: (): void =>
      apply(
        (current): EditorState =>
          setTableCellBorders(current, {
            width: 0,
            type: "none",
            color: "transparent",
          }),
        MERGE_KEYS.tableBorders,
      ),
    applyBorderPreset: (preset): void =>
      apply(
        (current): EditorState => applyTableBorderPreset(current, preset),
        MERGE_KEYS.tableBorders,
      ),
    isDrawingBorders: (): boolean => drawingBorders,
    toggleDrawingBorders: (): void => {
      drawingBorders = !drawingBorders;
      options.applyState({ ...options.state() });
    },
    isShowingGridlines: (): boolean => showingGridlines,
    toggleGridlines: (): void => {
      showingGridlines = !showingGridlines;
      options.applyState({ ...options.state() });
    },
    width100: (): void =>
      apply(
        (current): EditorState => setTableStyleValue(current, "width", "100%"),
        MERGE_KEYS.tableWidth,
      ),
    alignLeft: (): void =>
      apply(
        (current): EditorState =>
          setTableCellStyleValue(current, "horizontalAlign", "left"),
        MERGE_KEYS.tableAlign,
      ),
    alignCenter: (): void =>
      apply(
        (current): EditorState =>
          setTableCellStyleValue(current, "horizontalAlign", "center"),
        MERGE_KEYS.tableAlign,
      ),
    alignRight: (): void =>
      apply(
        (current): EditorState =>
          setTableCellStyleValue(current, "horizontalAlign", "right"),
        MERGE_KEYS.tableAlign,
      ),
    setCellAlignment: (alignment: TableCellAlignment): void =>
      apply(
        (current): EditorState =>
          setTableCellAlignment(
            current,
            alignment.horizontal,
            alignment.vertical,
          ),
        MERGE_KEYS.tableCellAlignment,
      ),
    getCellAlignmentState: () => getTableCellAlignmentState(options.state()),
    setCellVerticalAlign: (value: "top" | "middle" | "bottom"): void =>
      apply(
        (current): EditorState =>
          setTableCellStyleValue(current, "verticalAlign", value),
        MERGE_KEYS.tableCellVerticalAlign,
      ),
    setCellTextDirection: (
      value: "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV",
    ): void =>
      apply(
        (current): EditorState =>
          setTableCellStyleValue(current, "textDirection", value),
        MERGE_KEYS.tableCellTextDirection,
      ),
    setCellWidth: (width: string): void =>
      apply(
        (current): EditorState => setTableCellWidth(current, width),
        MERGE_KEYS.tableCellWidth,
      ),
    setCellNoWrap: (value: boolean | null): void =>
      apply(
        (current): EditorState => setTableCellNoWrap(current, value),
        MERGE_KEYS.tableCellWidth,
      ),
    setCellFitText: (value: boolean | null): void =>
      apply(
        (current): EditorState => setTableCellFitText(current, value),
        MERGE_KEYS.tableCellWidth,
      ),
    canSetCellMargins: (): boolean => canSetTableCellMargins(options.state()),
    setCellMargins: (margins: TableCellMargins): void =>
      apply(
        (current): EditorState => setActiveTableCellMargins(current, margins),
        MERGE_KEYS.tableCellMargins,
      ),
    canSetCellSpacing: (): boolean =>
      canSetActiveTableCellSpacing(options.state()),
    setCellSpacing: (value: number | null): void =>
      apply(
        (current): EditorState => setActiveTableCellSpacing(current, value),
        MERGE_KEYS.tableCellMargins,
      ),
    canSetTableIndent: (): boolean => canSetActiveTableIndent(options.state()),
    setTableIndent: (value: number | null): void =>
      apply(
        (current): EditorState => setActiveTableIndent(current, value),
        MERGE_KEYS.tableCellMargins,
      ),
    canSetTableAlignment: (): boolean =>
      canSetActiveTableAlignment(options.state()),
    setTableAlignment: (alignment: "left" | "center" | "right" | null): void =>
      apply(
        (current): EditorState =>
          setActiveTableAlignment(
            current,
            alignment as Parameters<typeof setActiveTableAlignment>[1],
          ),
        MERGE_KEYS.tableCellMargins,
      ),
    canEvaluateTableFormula: (): boolean =>
      canEvaluateActiveTableFormula(options.state()),
    evaluateTableFormula: (formula: string): void =>
      apply(
        (current): EditorState => evaluateActiveTableFormula(current, formula),
        MERGE_KEYS.tableFormula,
      ),
    canSelectTable: (): boolean => canSelectActiveTable(options.state()),
    selectTablePart: (kind: TableSelectionKind): void =>
      options.applyState(selectActiveTable(options.state(), kind)),
    canSetActiveTableRowHeight: (): boolean =>
      canSetActiveTableRowHeight(options.state()),
    setActiveTableRowHeight: (height: TableRowHeight): void =>
      apply(
        (current): EditorState => setActiveTableRowHeight(current, height),
        MERGE_KEYS.tableRowHeight,
      ),
    canSetActiveTableRowBreakAcrossPages: (): boolean =>
      canSetActiveTableRowBreakAcrossPages(options.state()),
    setActiveTableRowBreakAcrossPages: (allow: boolean | null): void =>
      apply(
        (current): EditorState =>
          setActiveTableRowBreakAcrossPages(current, allow),
        MERGE_KEYS.tableRowHeight,
      ),
    canSetActiveTableRowHeader: (): boolean =>
      canSetActiveTableRowHeader(options.state()),
    setActiveTableRowHeader: (value: boolean | null): void =>
      apply(
        (current): EditorState => setSelectedTableRowHeader(current, value),
        MERGE_KEYS.tableRepeatHeaderRows,
      ),
    canSetActiveTableColumnWidth: (): boolean =>
      canSetActiveTableColumnWidth(options.state()),
    setActiveTableColumnWidth: (width: number | string | null): void =>
      apply(
        (current): EditorState => setActiveTableColumnWidth(current, width),
        MERGE_KEYS.tableColumnWidth,
      ),
    canSetActiveTableWidth: (): boolean =>
      canSetActiveTableWidth(options.state()),
    setActiveTableWidth: (width: number | string | null): void =>
      apply(
        (current): EditorState => setActiveTableWidth(current, width),
        MERGE_KEYS.tableWidth,
      ),
    insert: (rows: number, cols: number): void =>
      options.tableOps.insertTableCommand(rows, cols),
  };
}
