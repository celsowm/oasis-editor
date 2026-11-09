import type { OasisPlugin } from "@/core/plugin.js";
import type { ActionCommandBuilder } from "../essentialsCommandBuilders.js";
import { numOrNull } from "../essentialsCommandBuilders.js";
import type {
  EssentialsFeatureGate,
  EssentialsTableCapability,
} from "../essentialsCapabilities.js";

interface TableGroupDeps {
  gate: EssentialsFeatureGate;
  table: EssentialsTableCapability;
  actionCommand: ActionCommandBuilder;
}

export function buildTableCommands({
  gate,
  table,
  actionCommand,
}: TableGroupDeps): NonNullable<OasisPlugin["commands"]> {
  return {
    tableContext: actionCommand(
      "tableContext",
      (): void => {},
      (): { isEnabled: boolean; isActive: boolean; value: string | null } => ({
        isEnabled: table.insideTable(),
        isActive: table.insideTable(),
        value: table.selectionLabel(),
      }),
    ),
    tableMerge: actionCommand(
      "tableMerge",
      (): void => table.merge(),
      (): { isEnabled: boolean } => ({
        isEnabled: gate.isCommandEnabled("tableMerge") && table.canMerge(),
      }),
    ),
    tableSplit: actionCommand(
      "tableSplit",
      (): void => table.split(),
      (): { isEnabled: boolean } => ({
        isEnabled: gate.isCommandEnabled("tableSplit") && table.canSplit(),
      }),
    ),
    tableToText: actionCommand(
      "tableToText",
      (): void => table.convertToText(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableToText") && table.canConvertToText(),
      }),
    ),
    textToTable: actionCommand(
      "textToTable",
      (): void => table.convertToTable(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("textToTable") && table.canConvertToTable(),
      }),
    ),
    tableSplitAtRow: actionCommand(
      "tableSplitAtRow",
      (): void => table.splitTableAtRow(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableSplitAtRow") &&
          table.canSplitTableAtRow(),
      }),
    ),
    tableSortAscending: actionCommand(
      "tableSortAscending",
      (): void => table.sortTable("ascending"),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableSortAscending") && table.canSortTable(),
      }),
    ),
    tableSortDescending: actionCommand(
      "tableSortDescending",
      (): void => table.sortTable("descending"),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableSortDescending") && table.canSortTable(),
      }),
    ),
    tableDelete: actionCommand(
      "tableDelete",
      (): void => table.deleteTable(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableDelete") && table.canDeleteTable(),
      }),
    ),
    tableRepeatHeaderRows: actionCommand(
      "tableRepeatHeaderRows",
      (): void => table.toggleRepeatHeaderRows(),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableRepeatHeaderRows") &&
          table.canToggleRepeatHeaderRows(),
        isActive: table.isRepeatHeaderRowsActive(),
      }),
    ),
    tableInsertColumnBefore: actionCommand(
      "tableInsertColumnBefore",
      (): void => table.insertColumnBefore(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableInsertColumnBefore") &&
          table.canEditColumn(),
      }),
    ),
    tableInsertColumnAfter: actionCommand(
      "tableInsertColumnAfter",
      (): void => table.insertColumnAfter(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableInsertColumnAfter") &&
          table.canEditColumn(),
      }),
    ),
    tableDeleteColumn: actionCommand(
      "tableDeleteColumn",
      (): void => table.deleteColumn(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableDeleteColumn") && table.canEditColumn(),
      }),
    ),
    tableInsertRowBefore: actionCommand(
      "tableInsertRowBefore",
      (): void => table.insertRowBefore(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableInsertRowBefore") && table.canEditRow(),
      }),
    ),
    tableInsertRowAfter: actionCommand(
      "tableInsertRowAfter",
      (): void => table.insertRowAfter(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableInsertRowAfter") && table.canEditRow(),
      }),
    ),
    tableDeleteRow: actionCommand(
      "tableDeleteRow",
      (): void => table.deleteRow(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableDeleteRow") && table.canEditRow(),
      }),
    ),
    tableDeleteCells: actionCommand(
      "tableDeleteCells",
      (): void => table.deleteCell(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableDeleteCells") && table.canDeleteCell(),
      }),
    ),
    tableCellShading: actionCommand("tableCellShading", (p): void =>
      table.cellShading((p as string) ?? null),
    ),
    tableCellBorders: actionCommand("tableCellBorders", (): void =>
      table.cellBorders(),
    ),
    tableCellNoBorders: actionCommand("tableCellNoBorders", (): void =>
      table.cellNoBorders(),
    ),
    tableApplyBorderPreset: actionCommand("tableApplyBorderPreset", (p): void =>
      table.applyBorderPreset(
        p as import("@/core/commands/table.js").TableBorderPreset,
      ),
    ),
    toggleTableDrawBorders: actionCommand(
      "toggleTableDrawBorders",
      (): void => table.toggleDrawingBorders(),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: table.insideTable(),
        isActive: table.isDrawingBorders(),
      }),
    ),
    toggleTableGridlines: actionCommand(
      "toggleTableGridlines",
      (): void => table.toggleGridlines(),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: table.insideTable(),
        isActive: table.isShowingGridlines(),
      }),
    ),
    tableWidth100: actionCommand("tableWidth100", (): void => table.width100()),
    tableAlignLeft: actionCommand("tableAlignLeft", (): void =>
      table.alignLeft(),
    ),
    tableAlignCenter: actionCommand("tableAlignCenter", (): void =>
      table.alignCenter(),
    ),
    tableAlignRight: actionCommand("tableAlignRight", (): void =>
      table.alignRight(),
    ),
    tableSetCellVerticalAlign: actionCommand(
      "tableSetCellVerticalAlign",
      (p): void =>
        table.setCellVerticalAlign(p as unknown as "top" | "middle" | "bottom"),
    ),
    tableSetCellTextDirection: actionCommand(
      "tableSetCellTextDirection",
      (p): void =>
        table.setCellTextDirection(
          p as unknown as "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV",
        ),
    ),
    tableSetCellWidth: actionCommand("tableSetCellWidth", (p): void =>
      table.setCellWidth(String(p)),
    ),
    tableSetRowHeight: actionCommand(
      "tableSetRowHeight",
      (p): void =>
        table.setActiveTableRowHeight(
          (p as import("@/core/commands/table.js").TableRowHeight) ?? {
            height: null,
          },
        ),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableSetRowHeight") &&
          table.canSetActiveTableRowHeight(),
      }),
    ),
    tableSetCellMargins: actionCommand(
      "tableSetCellMargins",
      (p): void =>
        table.setCellMargins(
          (p as import("@/core/commands/table.js").TableCellMargins) ?? {},
        ),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableSetCellMargins") &&
          table.canSetCellMargins(),
      }),
    ),
    tableSetCellSpacing: actionCommand(
      "tableSetCellSpacing",
      (p): void => table.setCellSpacing(numOrNull(p)),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableSetCellSpacing") &&
          table.canSetCellSpacing(),
      }),
    ),
    tableFormula: actionCommand(
      "tableFormula",
      (p): void => table.evaluateTableFormula(String(p)),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableFormula") &&
          table.canEvaluateTableFormula(),
      }),
    ),
    tableSelectCell: actionCommand(
      "tableSelectCell",
      (): void => table.selectTablePart("cell"),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableSelectCell") && table.canSelectTable(),
      }),
    ),
    tableSelectRow: actionCommand(
      "tableSelectRow",
      (): void => table.selectTablePart("row"),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableSelectRow") && table.canSelectTable(),
      }),
    ),
    tableSelectColumn: actionCommand(
      "tableSelectColumn",
      (): void => table.selectTablePart("column"),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableSelectColumn") && table.canSelectTable(),
      }),
    ),
    tableSelectTable: actionCommand(
      "tableSelectTable",
      (): void => table.selectTablePart("table"),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableSelectTable") && table.canSelectTable(),
      }),
    ),
    tableToggleHeaderRow: actionCommand(
      "tableToggleHeaderRow",
      (): void => table.toggleTblLook("firstRow"),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: table.insideTable(),
        isActive: table.getTblLook()?.firstRow ?? false,
      }),
    ),
    tableToggleTotalRow: actionCommand(
      "tableToggleTotalRow",
      (): void => table.toggleTblLook("lastRow"),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: table.insideTable(),
        isActive: table.getTblLook()?.lastRow ?? false,
      }),
    ),
    tableToggleBandedRows: actionCommand(
      "tableToggleBandedRows",
      (): void => table.toggleTblLook("bandedRows"),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: table.insideTable(),
        isActive: table.getTblLook()?.bandedRows ?? false,
      }),
    ),
    tableToggleFirstColumn: actionCommand(
      "tableToggleFirstColumn",
      (): void => table.toggleTblLook("firstCol"),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: table.insideTable(),
        isActive: table.getTblLook()?.firstCol ?? false,
      }),
    ),
    tableToggleLastColumn: actionCommand(
      "tableToggleLastColumn",
      (): void => table.toggleTblLook("lastCol"),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: table.insideTable(),
        isActive: table.getTblLook()?.lastCol ?? false,
      }),
    ),
    tableToggleBandedColumns: actionCommand(
      "tableToggleBandedColumns",
      (): void => table.toggleTblLook("bandedCols"),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: table.insideTable(),
        isActive: table.getTblLook()?.bandedCols ?? false,
      }),
    ),
    setTableStyle: actionCommand(
      "setTableStyle",
      (p): void => table.setStyleId(String(p ?? "")),
      (): { isEnabled: boolean; value: string | null } => ({
        isEnabled: table.insideTable(),
        value: table.getStyleId(),
      }),
    ),
    tableToggleAutoFit: actionCommand(
      "tableToggleAutoFit",
      (): void => table.toggleAutoFit(),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: table.insideTable(),
        isActive: table.getLayout() === "autofit",
      }),
    ),
    tableAutoFit: actionCommand(
      "tableAutoFit",
      (p): void =>
        table.setAutoFit((p as "contents" | "window" | "fixed") ?? "contents"),
      (): { isEnabled: boolean } => ({ isEnabled: table.canSetAutoFit() }),
    ),
    tableDistributeColumns: actionCommand(
      "tableDistributeColumns",
      (): void => table.distributeColumns(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableDistributeColumns") &&
          table.canEditColumn(),
      }),
    ),
    tableDistributeRows: actionCommand(
      "tableDistributeRows",
      (): void => table.distributeRows(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("tableDistributeRows") && table.canEditRow(),
      }),
    ),
    insertTable: actionCommand("insertTable", (p): void => {
      const { rows, cols, columns } = (p ?? {}) as {
        rows?: number;
        cols?: number;
        columns?: number;
      };
      const columnCount = cols ?? columns;
      if (rows && columnCount) {
        table.insert(rows, columnCount);
      }
    }),
  };
}
