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

export function TableGroup(props: { ctx: () => EditorToolbarCtx }) {
  const ctx = props.ctx;
  const state = () => ctx().state;
  const focusInput = () => ctx().focusInput();

  return (
    <>
      <ToolbarGroup>
        <ToolbarButton
          icon="combine"
          label="Merge Selection"
          wide
          data-testid="editor-2-toolbar-merge-table"
          disabled={!ctx().canMergeSelectedTable(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().mergeSelectedTable(current),
              { mergeKey: "mergeTable" },
            );
            ctx().focusInput();
          }}
          tooltip="Merge selected cells horizontally or vertically"
        />
        <ToolbarButton
          icon="split"
          label="Split Selection"
          wide
          data-testid="editor-2-toolbar-split-table"
          disabled={!ctx().canSplitSelectedTable(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().splitSelectedTable(current),
              { mergeKey: "splitTable" },
            );
            ctx().focusInput();
          }}
          tooltip="Split selected cells horizontally or vertically"
        />
        <ToolbarButton
          icon="palette"
          label="Color"
          wide
          data-testid="editor-2-toolbar-table-shading"
          onClick={() => {
            const color = prompt("Cell Background Color (e.g. #f1f5f9):", "#f1f5f9");
            if (color !== null) {
              ctx().applyTransactionalState(
                (current) => setTableCellStyleValue(current, "shading", color || null),
                { mergeKey: "tableShading" },
              );
              ctx().focusInput();
            }
          }}
          tooltip="Cell Background Color"
        />
        <ToolbarButton
          icon="frame"
          data-testid="editor-2-toolbar-table-borders"
          onClick={() => {
            ctx().applyTransactionalState(
              (current) =>
                setTableCellBorders(current, { width: 1, type: "solid", color: "#64748b" }),
              { mergeKey: "tableBorders" },
            );
            ctx().focusInput();
          }}
          tooltip="Apply 1pt solid border to selected cells"
        />
        <ToolbarButton
          icon="square"
          data-testid="editor-2-toolbar-table-no-borders"
          onClick={() => {
            ctx().applyTransactionalState(
              (current) =>
                setTableCellBorders(current, { width: 0, type: "none", color: "transparent" }),
              { mergeKey: "tableBorders" },
            );
            ctx().focusInput();
          }}
          tooltip="Remove borders from selected cells"
        />
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          icon="maximize"
          label="100%"
          wide
          data-testid="editor-2-toolbar-table-width-100"
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => setTableStyleValue(current, "width", "100%"),
              { mergeKey: "tableWidth" },
            );
            ctx().focusInput();
          }}
          tooltip="Table Width 100%"
        />
        <ToolbarButton
          icon="align-left"
          data-testid="editor-2-toolbar-table-align-left"
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => setTableStyleValue(current, "align", "left"),
              { mergeKey: "tableAlign" },
            );
            ctx().focusInput();
          }}
          tooltip="Align table to the left"
        />
        <ToolbarButton
          icon="align-center"
          data-testid="editor-2-toolbar-table-align-center"
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => setTableStyleValue(current, "align", "center"),
              { mergeKey: "tableAlign" },
            );
            ctx().focusInput();
          }}
          tooltip="Align table to the center"
        />
        <ToolbarButton
          icon="align-right"
          data-testid="editor-2-toolbar-table-align-right"
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => setTableStyleValue(current, "align", "right"),
              { mergeKey: "tableAlign" },
            );
            ctx().focusInput();
          }}
          tooltip="Align table to the right"
        />
      </ToolbarGroup>

      <details class="oasis-editor-2-table-actions-advanced">
        <summary class="oasis-editor-2-table-actions-summary">Advanced table actions</summary>
        <div class="oasis-editor-2-toolbar-group oasis-editor-2-table-actions-group">
          <ToolbarButton
            icon="columns"
            label="Insert Column Before"
            wide
            data-testid="editor-2-toolbar-insert-table-column-before"
            disabled={!ctx().canEditSelectedTableColumn(state())}
            onClick={() => {
              ctx().applyTransactionalState(
                (current) => ctx().insertSelectedTableColumn(current, -1),
                { mergeKey: "insertTableColumn" },
              );
              ctx().focusInput();
            }}
            tooltip="Insert a column to the left"
          />
          <ToolbarButton
            icon="columns"
            label="Insert Column After"
            wide
            data-testid="editor-2-toolbar-insert-table-column-after"
            disabled={!ctx().canEditSelectedTableColumn(state())}
            onClick={() => {
              ctx().applyTransactionalState(
                (current) => ctx().insertSelectedTableColumn(current, 1),
                { mergeKey: "insertTableColumn" },
              );
              ctx().focusInput();
            }}
            tooltip="Insert a column to the right"
          />
          <ToolbarButton
            icon="columns"
            label="Delete Column"
            wide
            data-testid="editor-2-toolbar-delete-table-column"
            disabled={!ctx().canEditSelectedTableColumn(state())}
            onClick={() => {
              ctx().applyTransactionalState(
                (current) => ctx().deleteSelectedTableColumn(current),
                { mergeKey: "deleteTableColumn" },
              );
              ctx().focusInput();
            }}
            tooltip="Delete the current column"
          />
          <ToolbarButton
            icon="combine"
            label="Merge Horizontally"
            wide
            data-testid="editor-2-toolbar-merge-table-cells"
            disabled={!ctx().canMergeSelectedTableCells(state())}
            onClick={() => {
              ctx().applyTransactionalState(
                (current) => ctx().mergeSelectedTableCells(current),
                { mergeKey: "mergeTableCells" },
              );
              focusInput();
            }}
            tooltip="Merge selected cells horizontally"
          />
          <ToolbarButton
            icon="split"
            label="Split Horizontally"
            wide
            data-testid="editor-2-toolbar-split-table-cell"
            disabled={!ctx().canSplitSelectedTableCell(state())}
            onClick={() => {
              ctx().applyTransactionalState(
                (current) => ctx().splitSelectedTableCell(current),
                { mergeKey: "splitTableCell" },
              );
              focusInput();
            }}
            tooltip="Split selected cell horizontally"
          />
          <ToolbarButton
            icon="rows"
            label="Insert Row Before"
            wide
            data-testid="editor-2-toolbar-insert-table-row-before"
            disabled={!ctx().canEditSelectedTableRow(state())}
            onClick={() => {
              ctx().applyTransactionalState(
                (current) => ctx().insertSelectedTableRow(current, -1),
                { mergeKey: "insertTableRow" },
              );
              ctx().focusInput();
            }}
            tooltip="Insert a row above the current one"
          />
          <ToolbarButton
            icon="rows"
            label="Insert Row After"
            wide
            data-testid="editor-2-toolbar-insert-table-row-after"
            disabled={!ctx().canEditSelectedTableRow(state())}
            onClick={() => {
              ctx().applyTransactionalState(
                (current) => ctx().insertSelectedTableRow(current, 1),
                { mergeKey: "insertTableRow" },
              );
              ctx().focusInput();
            }}
            tooltip="Insert a row below the current one"
          />
          <ToolbarButton
            icon="rows"
            label="Delete Row"
            wide
            data-testid="editor-2-toolbar-delete-table-row"
            disabled={!ctx().canEditSelectedTableRow(state())}
            onClick={() => {
              ctx().applyTransactionalState(
                (current) => ctx().deleteSelectedTableRow(current),
                { mergeKey: "deleteTableRow" },
              );
              ctx().focusInput();
            }}
            tooltip="Delete the current row"
          />
          <ToolbarButton
            icon="combine"
            label="Merge Vertically"
            wide
            data-testid="editor-2-toolbar-merge-table-rows"
            disabled={!ctx().canMergeSelectedTableRows(state())}
            onClick={() => {
              ctx().applyTransactionalState(
                (current) => ctx().mergeSelectedTableRows(current),
                { mergeKey: "mergeTableRows" },
              );
              focusInput();
            }}
            tooltip="Merge selected cells vertically"
          />
          <ToolbarButton
            icon="split"
            label="Split Vertically"
            wide
            data-testid="editor-2-toolbar-split-table-row"
            disabled={!ctx().canSplitSelectedTableCellVertically(state())}
            onClick={() => {
              ctx().applyTransactionalState(
                (current) => ctx().splitSelectedTableCellVertically(current),
                { mergeKey: "splitTableRow" },
              );
              focusInput();
            }}
            tooltip="Split selected cell vertically"
          />
          <ToolbarButton
            icon="maximize"
            label="Cell Width"
            wide
            data-testid="editor-2-toolbar-table-cell-width"
            onClick={() => {
              const width = prompt("Cell Width (e.g. 100pt or 33%):", "");
              if (width !== null) {
                ctx().applyTransactionalState(
                  (current) => ctx().applyTableAwareParagraphEdit(current, (temp) => setTableCellWidth(temp, width || null)),
                  { mergeKey: "tableCellWidth" },
                );
                ctx().focusInput();
              }
            }}
            tooltip="Set selected cell width"
          />
        </div>
      </details>

      <Show when={ctx().tableSelectionLabel()}>
        {(label) => (
          <div class="oasis-editor-2-toolbar-badge" data-testid="editor-2-table-selection-label">
            {label()}
          </div>
        )}
      </Show>
      <Show when={ctx().tableActionRestrictionLabel()}>
        {(label) => (
          <div class="oasis-editor-2-toolbar-note" data-testid="editor-2-table-actions-note">
            {label()}
          </div>
        )}
      </Show>
    </>
  );
}
