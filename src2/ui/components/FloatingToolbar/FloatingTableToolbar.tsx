import { Show, createMemo, type Accessor, type JSX } from "solid-js";
import "./floatingToolbar.css";
import {
  setTableCellBorders,
  setTableCellStyleValue,
} from "../../../core/editorCommands.js";
import type { SelectionBox } from "../../editorUiTypes.js";
import type { EditorToolbarCtx } from "../Toolbar/types.js";
import { ToolbarButton } from "../Toolbar/ToolbarButton.js";
import { ToolbarGroup, ToolbarSeparator } from "../Toolbar/ToolbarGroup.js";

export interface FloatingTableToolbarProps {
  ctx: () => EditorToolbarCtx;
  selectionBoxes: Accessor<SelectionBox[]>;
  visible: Accessor<boolean>;
}

export function FloatingTableToolbar(
  props: FloatingTableToolbarProps,
): JSX.Element {
  const ctx = props.ctx;
  const state = () => ctx().state;

  const position = createMemo(() => {
    if (!props.visible()) {
      return null;
    }
    const boxes = props.selectionBoxes();
    if (boxes.length === 0) {
      return null;
    }
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    for (const box of boxes) {
      if (box.left < left) left = box.left;
      if (box.top < top) top = box.top;
      if (box.left + box.width > right) right = box.left + box.width;
    }
    if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(right)) {
      return null;
    }
    return { centerX: (left + right) / 2, top };
  });

  return (
    <Show when={position()}>
      {(pos) => (
        <div
          class="oasis-editor-2-floating-toolbar"
          data-testid="editor-2-floating-table-toolbar"
          style={{
            left: `${pos().centerX}px`,
            top: `${pos().top}px`,
          }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <ToolbarGroup>
            <ToolbarButton
              icon="combine"
              data-testid="editor-2-floating-toolbar-merge"
              disabled={!ctx().canMergeSelectedTable(state())}
              onClick={() => {
                ctx().applyTransactionalState(
                  (current) => ctx().mergeSelectedTable(current),
                  { mergeKey: "mergeTable" },
                );
                ctx().focusInput();
              }}
              tooltip="Merge cells"
            />
            <ToolbarButton
              icon="split"
              data-testid="editor-2-floating-toolbar-split"
              disabled={!ctx().canSplitSelectedTable(state())}
              onClick={() => {
                ctx().applyTransactionalState(
                  (current) => ctx().splitSelectedTable(current),
                  { mergeKey: "splitTable" },
                );
                ctx().focusInput();
              }}
              tooltip="Split cells"
            />
          </ToolbarGroup>

          <ToolbarSeparator />

          <ToolbarGroup>
            <ToolbarButton
              icon="align-left"
              data-testid="editor-2-floating-toolbar-align-left"
              onClick={() => {
                ctx().applyTransactionalState(
                  (current) =>
                    setTableCellStyleValue(current, "horizontalAlign", "left"),
                  { mergeKey: "tableAlign" },
                );
                ctx().focusInput();
              }}
              tooltip="Align left"
            />
            <ToolbarButton
              icon="align-center"
              data-testid="editor-2-floating-toolbar-align-center"
              onClick={() => {
                ctx().applyTransactionalState(
                  (current) =>
                    setTableCellStyleValue(current, "horizontalAlign", "center"),
                  { mergeKey: "tableAlign" },
                );
                ctx().focusInput();
              }}
              tooltip="Align center"
            />
            <ToolbarButton
              icon="align-right"
              data-testid="editor-2-floating-toolbar-align-right"
              onClick={() => {
                ctx().applyTransactionalState(
                  (current) =>
                    setTableCellStyleValue(current, "horizontalAlign", "right"),
                  { mergeKey: "tableAlign" },
                );
                ctx().focusInput();
              }}
              tooltip="Align right"
            />
          </ToolbarGroup>

          <ToolbarSeparator />

          <ToolbarGroup>
            <ToolbarButton
              icon="palette"
              data-testid="editor-2-floating-toolbar-shading"
              onClick={() => {
                const color = prompt("Cell Background Color:", "#f1f5f9");
                if (color !== null) {
                  ctx().applyTransactionalState(
                    (current) =>
                      setTableCellStyleValue(current, "shading", color || null),
                    { mergeKey: "tableShading" },
                  );
                  ctx().focusInput();
                }
              }}
              tooltip="Cell color"
            />
            <ToolbarButton
              icon="frame"
              data-testid="editor-2-floating-toolbar-borders"
              onClick={() => {
                ctx().applyTransactionalState(
                  (current) =>
                    setTableCellBorders(current, {
                      width: 1,
                      type: "solid",
                      color: "#64748b",
                    }),
                  { mergeKey: "tableBorders" },
                );
                ctx().focusInput();
              }}
              tooltip="Apply borders"
            />
            <ToolbarButton
              icon="square"
              data-testid="editor-2-floating-toolbar-no-borders"
              onClick={() => {
                ctx().applyTransactionalState(
                  (current) =>
                    setTableCellBorders(current, {
                      width: 0,
                      type: "none",
                      color: "transparent",
                    }),
                  { mergeKey: "tableBorders" },
                );
                ctx().focusInput();
              }}
              tooltip="Remove borders"
            />
          </ToolbarGroup>

          <ToolbarSeparator />

          <ToolbarGroup>
            <ToolbarButton
              icon="rows"
              data-testid="editor-2-floating-toolbar-insert-row-above"
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
              data-testid="editor-2-floating-toolbar-insert-row-below"
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
              icon="columns"
              data-testid="editor-2-floating-toolbar-insert-column-left"
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
              data-testid="editor-2-floating-toolbar-insert-column-right"
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
          </ToolbarGroup>

          <ToolbarSeparator />

          <ToolbarGroup>
            <ToolbarButton
              icon="trash-2"
              data-testid="editor-2-floating-toolbar-delete-row"
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
            <ToolbarButton
              icon="trash-2"
              data-testid="editor-2-floating-toolbar-delete-column"
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
        </div>
      )}
    </Show>
  );
}
