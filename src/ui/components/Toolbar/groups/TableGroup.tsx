import { Show, type JSX } from "solid-js";
import {
  setTableCellBorders,
  setTableCellStyleValue,
  setTableCellWidth,
  setTableStyleValue,
} from "../../../../core/editorCommands.js";
import type { EditorToolbarCtx } from "../types.js";
import { ToolbarButton } from "../ToolbarButton.js";
import { ToolbarGroup } from "../ToolbarGroup.js";
import { ToolbarDropdown } from "../ToolbarDropdown.js";
import { t } from "../../../../i18n/index.js";

export function TableGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const state = () => ctx().state;
  const focusInput = () => ctx().focusInput();

  return (
    <ToolbarGroup>
      <ToolbarDropdown
        label=""
        icon="table-properties"
        testId="editor-toolbar-table-dropdown"
        tooltip={t("toolbar.table")}
        hideChevron
        menuClass="oasis-editor-toolbar-panel oasis-editor-toolbar-table-panel"
        keepMounted
      >
      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <ToolbarButton
          icon="combine"
          data-testid="editor-toolbar-merge-table"
          disabled={!ctx().canMergeSelectedTable(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().mergeSelectedTable(current),
              { mergeKey: "mergeTable" },
            );
            ctx().focusInput();
          }}
          tooltip={t("table.mergeTooltip")}
        />
        <ToolbarButton
          icon="split"
          data-testid="editor-toolbar-split-table"
          disabled={!ctx().canSplitSelectedTable(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().splitSelectedTable(current),
              { mergeKey: "splitTable" },
            );
            ctx().focusInput();
          }}
          tooltip={t("table.splitTooltip")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <ToolbarButton
          icon="columns"
          data-testid="editor-toolbar-insert-table-column-before"
          disabled={!ctx().canEditSelectedTableColumn(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().insertSelectedTableColumn(current, -1),
              { mergeKey: "insertTableColumn" },
            );
            ctx().focusInput();
          }}
          tooltip={t("table.insertColumnLeft")}
        />
        <ToolbarButton
          icon="columns"
          data-testid="editor-toolbar-insert-table-column-after"
          disabled={!ctx().canEditSelectedTableColumn(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().insertSelectedTableColumn(current, 1),
              { mergeKey: "insertTableColumn" },
            );
            ctx().focusInput();
          }}
          tooltip={t("table.insertColumnRight")}
        />
        <ToolbarButton
          icon="trash-2"
          data-testid="editor-toolbar-delete-table-column"
          disabled={!ctx().canEditSelectedTableColumn(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().deleteSelectedTableColumn(current),
              { mergeKey: "deleteTableColumn" },
            );
            ctx().focusInput();
          }}
          tooltip={t("table.deleteColumn")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <ToolbarButton
          icon="rows"
          data-testid="editor-toolbar-insert-table-row-before"
          disabled={!ctx().canEditSelectedTableRow(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().insertSelectedTableRow(current, -1),
              { mergeKey: "insertTableRow" },
            );
            ctx().focusInput();
          }}
          tooltip={t("table.insertRowAbove")}
        />
        <ToolbarButton
          icon="rows"
          data-testid="editor-toolbar-insert-table-row-after"
          disabled={!ctx().canEditSelectedTableRow(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().insertSelectedTableRow(current, 1),
              { mergeKey: "insertTableRow" },
            );
            ctx().focusInput();
          }}
          tooltip={t("table.insertRowBelow")}
        />
        <ToolbarButton
          icon="trash-2"
          data-testid="editor-toolbar-delete-table-row"
          disabled={!ctx().canEditSelectedTableRow(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().deleteSelectedTableRow(current),
              { mergeKey: "deleteTableRow" },
            );
            ctx().focusInput();
          }}
          tooltip={t("table.deleteRow")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <ToolbarButton
          icon="palette"
          data-testid="editor-toolbar-table-shading"
          onClick={() => {
            const color = prompt(t("table.cellBgColorPrompt"), "#f1f5f9");
            if (color !== null) {
              ctx().applyTransactionalState(
                (current) => setTableCellStyleValue(current, "shading", color || null),
                { mergeKey: "tableShading" },
              );
              ctx().focusInput();
            }
          }}
          tooltip={t("table.cellColor")}
        />
        <ToolbarButton
          icon="frame"
          data-testid="editor-toolbar-table-borders"
          onClick={() => {
            ctx().applyTransactionalState(
              (current) =>
                setTableCellBorders(current, { width: 1, type: "solid", color: "#64748b" }),
              { mergeKey: "tableBorders" },
            );
            ctx().focusInput();
          }}
          tooltip={t("table.applyBorders")}
        />
        <ToolbarButton
          icon="square"
          data-testid="editor-toolbar-table-no-borders"
          onClick={() => {
            ctx().applyTransactionalState(
              (current) =>
                setTableCellBorders(current, { width: 0, type: "none", color: "transparent" }),
              { mergeKey: "tableBorders" },
            );
            ctx().focusInput();
          }}
          tooltip={t("table.removeBorders")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <ToolbarButton
          icon="maximize"
          data-testid="editor-toolbar-table-width-100"
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => setTableStyleValue(current, "width", "100%"),
              { mergeKey: "tableWidth" },
            );
            ctx().focusInput();
          }}
          tooltip={t("table.width100Tooltip")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <ToolbarButton
          icon="align-left"
          data-testid="editor-toolbar-table-align-left"
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => setTableCellStyleValue(current, "horizontalAlign", "left"),
              { mergeKey: "tableAlign" },
            );
            ctx().focusInput();
          }}
          tooltip={t("table.alignLeft")}
        />
        <ToolbarButton
          icon="align-center"
          data-testid="editor-toolbar-table-align-center"
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => setTableCellStyleValue(current, "horizontalAlign", "center"),
              { mergeKey: "tableAlign" },
            );
            ctx().focusInput();
          }}
          tooltip={t("table.alignCenter")}
        />
        <ToolbarButton
          icon="align-right"
          data-testid="editor-toolbar-table-align-right"
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => setTableCellStyleValue(current, "horizontalAlign", "right"),
              { mergeKey: "tableAlign" },
            );
            ctx().focusInput();
          }}
          tooltip={t("table.alignRight")}
        />
        <ToolbarButton
          icon="move-horizontal"
          data-testid="editor-toolbar-table-cell-width"
          onClick={() => {
            const width = prompt(t("table.cellWidthPrompt"));
            if (width) {
              ctx().applyTransactionalState(
                (current) => setTableCellWidth(current, width),
                { mergeKey: "tableCellWidth" },
              );
              ctx().focusInput();
            }
          }}
          tooltip={t("table.cellWidth")}
        />
      </div>

      <Show when={ctx().tableSelectionLabel()}>
        {(label) => (
          <div class="oasis-editor-toolbar-badge" data-testid="editor-table-selection-label">
            {label()}
          </div>
        )}
      </Show>
      </ToolbarDropdown>
    </ToolbarGroup>
  );
}
