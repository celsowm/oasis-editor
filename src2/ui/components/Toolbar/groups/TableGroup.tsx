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
          label="Merge"
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
          tooltip="Merge selected cells"
        />
        <ToolbarButton
          icon="split"
          label="Split"
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
          tooltip="Split selected cells"
        />
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          icon="columns"
          data-testid="editor-2-toolbar-insert-table-column-before"
          disabled={!ctx().canEditSelectedTableColumn(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().insertSelectedTableColumn(current, -1),
              { mergeKey: "insertTableColumn" },
            );
            ctx().focusInput();
          }}
          tooltip="Insert column left"
        />
        <ToolbarButton
          icon="columns"
          data-testid="editor-2-toolbar-insert-table-column-after"
          disabled={!ctx().canEditSelectedTableColumn(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().insertSelectedTableColumn(current, 1),
              { mergeKey: "insertTableColumn" },
            );
            ctx().focusInput();
          }}
          tooltip="Insert column right"
        />
        <ToolbarButton
          icon="trash-2"
          data-testid="editor-2-toolbar-delete-table-column"
          disabled={!ctx().canEditSelectedTableColumn(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().deleteSelectedTableColumn(current),
              { mergeKey: "deleteTableColumn" },
            );
            ctx().focusInput();
          }}
          tooltip="Delete column"
        />
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          icon="rows"
          data-testid="editor-2-toolbar-insert-table-row-before"
          disabled={!ctx().canEditSelectedTableRow(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().insertSelectedTableRow(current, -1),
              { mergeKey: "insertTableRow" },
            );
            ctx().focusInput();
          }}
          tooltip="Insert row above"
        />
        <ToolbarButton
          icon="rows"
          data-testid="editor-2-toolbar-insert-table-row-after"
          disabled={!ctx().canEditSelectedTableRow(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().insertSelectedTableRow(current, 1),
              { mergeKey: "insertTableRow" },
            );
            ctx().focusInput();
          }}
          tooltip="Insert row below"
        />
        <ToolbarButton
          icon="trash-2"
          data-testid="editor-2-toolbar-delete-table-row"
          disabled={!ctx().canEditSelectedTableRow(state())}
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => ctx().deleteSelectedTableRow(current),
              { mergeKey: "deleteTableRow" },
            );
            ctx().focusInput();
          }}
          tooltip="Delete row"
        />
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          icon="palette"
          data-testid="editor-2-toolbar-table-shading"
          onClick={() => {
            const color = prompt("Cell Background Color:", "#f1f5f9");
            if (color !== null) {
              ctx().applyTransactionalState(
                (current) => setTableCellStyleValue(current, "shading", color || null),
                { mergeKey: "tableShading" },
              );
              ctx().focusInput();
            }
          }}
          tooltip="Cell Color"
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
          tooltip="Apply borders"
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
          tooltip="Remove borders"
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
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          icon="align-left"
          data-testid="editor-2-toolbar-table-align-left"
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => setTableCellStyleValue(current, "horizontalAlign", "left"),
              { mergeKey: "tableAlign" },
            );
            ctx().focusInput();
          }}
          tooltip="Align Left"
        />
        <ToolbarButton
          icon="align-center"
          data-testid="editor-2-toolbar-table-align-center"
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => setTableCellStyleValue(current, "horizontalAlign", "center"),
              { mergeKey: "tableAlign" },
            );
            ctx().focusInput();
          }}
          tooltip="Align Center"
        />
        <ToolbarButton
          icon="align-right"
          data-testid="editor-2-toolbar-table-align-right"
          onClick={() => {
            ctx().applyTransactionalState(
              (current) => setTableCellStyleValue(current, "horizontalAlign", "right"),
              { mergeKey: "tableAlign" },
            );
            ctx().focusInput();
          }}
          tooltip="Align Right"
        />
        <ToolbarButton
          icon="move-horizontal"
          data-testid="editor-2-toolbar-table-cell-width"
          onClick={() => {
            const width = prompt("Cell Width (e.g. 50% or 200pt):");
            if (width) {
              ctx().applyTransactionalState(
                (current) => setTableCellWidth(current, width),
                { mergeKey: "tableCellWidth" },
              );
              ctx().focusInput();
            }
          }}
          tooltip="Cell Width"
        />
      </ToolbarGroup>

      <Show when={ctx().tableSelectionLabel()}>
        {(label) => (
          <div class="oasis-editor-2-toolbar-badge" data-testid="editor-2-table-selection-label">
            {label()}
          </div>
        )}
      </Show>
    </>
  );
}
