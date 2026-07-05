import { MERGE_KEYS, type MergeKey } from "@/core/transactionMergeKeys.js";
import {
  distributeSelectedTableColumns,
  distributeSelectedTableRows,
  setTableCellBorders,
  setTableCellStyleValue,
  setTableCellWidth,
  setTableStyleValue,
} from "@/core/commands/table.js";
import {
  findParagraphTableLocation,
  getActiveSectionIndex,
  getDocumentSections,
  type EditorState,
  type EditorTableNode,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import type {
  EssentialsTableCapability,
  TableLookState,
} from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

export function buildEssentialsTable(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsTableCapability {
  const insideTable = (): boolean =>
    Boolean(
      findParagraphTableLocation(
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
    const secIdx = getActiveSectionIndex(state);
    const loc = findParagraphTableLocation(
      state.document,
      state.selection.focus.paragraphId,
      secIdx,
    );
    if (!loc) return null;
    const section = getDocumentSections(state.document)[secIdx];
    if (!section) return null;
    const blocks =
      loc.zone === "header"
        ? (section.header ?? [])
        : loc.zone === "footer"
          ? (section.footer ?? [])
          : section.blocks;
    const table = blocks[loc.blockIndex];
    return table && table.type === "table" ? table : null;
  };
  const rawTblLookIn = (
    state: EditorState,
  ): typeof RAW_TBL_LOOK_DEFAULTS | null => {
    const table = selectedTableIn(state);
    if (!table) return null;
    return { ...RAW_TBL_LOOK_DEFAULTS, ...(table.style?.tblLook ?? {}) };
  };
  const selectionLabel = (): string | null => {
    const normalized = normalizeSelection(options.state());
    if (normalized.isCollapsed) return null;
    const secIdx = getActiveSectionIndex(options.state());
    const anchorLoc = findParagraphTableLocation(
      options.state().document,
      options.state().selection.anchor.paragraphId,
      secIdx,
    );
    const focusLoc = findParagraphTableLocation(
      options.state().document,
      options.state().selection.focus.paragraphId,
      secIdx,
    );
    if (
      !anchorLoc ||
      !focusLoc ||
      anchorLoc.blockIndex !== focusLoc.blockIndex ||
      (anchorLoc.rowIndex === focusLoc.rowIndex &&
        anchorLoc.cellIndex === focusLoc.cellIndex)
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
        // Banding is stored as the negated "no band" flags in OOXML.
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
    setCellWidth: (width: string): void =>
      apply(
        (current): EditorState => setTableCellWidth(current, width),
        MERGE_KEYS.tableCellWidth,
      ),
    insert: (rows: number, cols: number): void =>
      options.tableOps.insertTableCommand(rows, cols),
  };
}
