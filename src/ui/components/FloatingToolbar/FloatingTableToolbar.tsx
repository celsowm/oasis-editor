import { Show, createMemo, createSignal, onCleanup, onMount, type Accessor, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import "./floatingToolbar.css";
import {
  setTableCellBorders,
  setTableCellStyleValue,
} from "../../../core/editorCommands.js";
import type { SelectionBox } from "../../editorUiTypes.js";
import type { EditorToolbarCtx } from "../Toolbar/types.js";
import { ToolbarButton } from "../Toolbar/ToolbarButton.js";
import { ToolbarGroup, ToolbarSeparator } from "../Toolbar/ToolbarGroup.js";
import { t } from "../../../i18n/index.js";

export interface FloatingTableToolbarProps {
  ctx: () => EditorToolbarCtx;
  selectionBoxes: Accessor<SelectionBox[]>;
  visible: Accessor<boolean>;
  surfaceRef: () => HTMLElement | undefined;
}

export function FloatingTableToolbar(
  props: FloatingTableToolbarProps,
): JSX.Element {
  const ctx = props.ctx;
  const state = () => ctx().state;

  const [surfaceRect, setSurfaceRect] = createSignal<DOMRect | null>(null);
  const [tick, setTick] = createSignal(0);

  const refreshSurfaceRect = () => {
    const surface = props.surfaceRef();
    if (surface) {
      setSurfaceRect(surface.getBoundingClientRect());
    } else {
      setSurfaceRect(null);
    }
  };

  let frame: number | null = null;
  const scheduleRefresh = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      refreshSurfaceRect();
      setTick((t) => t + 1);
    });
  };

  onMount(() => {
    refreshSurfaceRect();
    window.addEventListener("scroll", scheduleRefresh, true);
    window.addEventListener("resize", scheduleRefresh);
    onCleanup(() => {
      window.removeEventListener("scroll", scheduleRefresh, true);
      window.removeEventListener("resize", scheduleRefresh);
      if (frame !== null) cancelAnimationFrame(frame);
    });
  });

  const position = createMemo(() => {
    tick();
    if (!props.visible()) {
      return null;
    }
    const boxes = props.selectionBoxes();
    if (boxes.length === 0) {
      return null;
    }
    const rect = surfaceRect();
    if (!rect) {
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
    const viewportCenterX = rect.left + (left + right) / 2;
    const viewportTop = rect.top + top;
    return { centerX: viewportCenterX, top: viewportTop };
  });

  // Re-read surface rect any time visible/selection changes
  createMemo(() => {
    props.visible();
    props.selectionBoxes();
    if (typeof window !== "undefined") {
      scheduleRefresh();
    }
  });

  return (
    <Show when={position()}>
      {(pos) => (
        <Portal mount={document.body}>
          <div
            class="oasis-editor-floating-toolbar"
            data-testid="editor-floating-table-toolbar"
            style={{
              left: `${pos().centerX}px`,
              top: `${pos().top}px`,
            }}
            onMouseDown={(event) => event.preventDefault()}
          >
            <ToolbarGroup>
              <ToolbarButton
                icon="combine"
                data-testid="editor-floating-toolbar-merge"
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
                data-testid="editor-floating-toolbar-split"
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
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
              <ToolbarButton
                icon="align-left"
                data-testid="editor-floating-toolbar-align-left"
                onClick={() => {
                  ctx().applyTransactionalState(
                    (current) =>
                      setTableCellStyleValue(current, "horizontalAlign", "left"),
                    { mergeKey: "tableAlign" },
                  );
                  ctx().focusInput();
                }}
                tooltip={t("table.alignLeft")}
              />
              <ToolbarButton
                icon="align-center"
                data-testid="editor-floating-toolbar-align-center"
                onClick={() => {
                  ctx().applyTransactionalState(
                    (current) =>
                      setTableCellStyleValue(current, "horizontalAlign", "center"),
                    { mergeKey: "tableAlign" },
                  );
                  ctx().focusInput();
                }}
                tooltip={t("table.alignCenter")}
              />
              <ToolbarButton
                icon="align-right"
                data-testid="editor-floating-toolbar-align-right"
                onClick={() => {
                  ctx().applyTransactionalState(
                    (current) =>
                      setTableCellStyleValue(current, "horizontalAlign", "right"),
                    { mergeKey: "tableAlign" },
                  );
                  ctx().focusInput();
                }}
                tooltip={t("table.alignRight")}
              />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
              <ToolbarButton
                icon="palette"
                data-testid="editor-floating-toolbar-shading"
                onClick={() => {
                  const color = prompt(t("table.cellBgColorPrompt"), "#f1f5f9");
                  if (color !== null) {
                    ctx().applyTransactionalState(
                      (current) =>
                        setTableCellStyleValue(current, "shading", color || null),
                      { mergeKey: "tableShading" },
                    );
                    ctx().focusInput();
                  }
                }}
                tooltip={t("table.cellColor")}
              />
              <ToolbarButton
                icon="frame"
                data-testid="editor-floating-toolbar-borders"
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
                tooltip={t("table.applyBorders")}
              />
              <ToolbarButton
                icon="square"
                data-testid="editor-floating-toolbar-no-borders"
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
                tooltip={t("table.removeBorders")}
              />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
              <ToolbarButton
                icon="arrow-up-to-line"
                data-testid="editor-floating-toolbar-insert-row-above"
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
                icon="arrow-down-to-line"
                data-testid="editor-floating-toolbar-insert-row-below"
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
                icon="arrow-left-to-line"
                data-testid="editor-floating-toolbar-insert-column-left"
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
                icon="arrow-right-to-line"
                data-testid="editor-floating-toolbar-insert-column-right"
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
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
              <ToolbarButton
                icon="rows-3"
                data-testid="editor-floating-toolbar-delete-row"
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
              <ToolbarButton
                icon="columns-3"
                data-testid="editor-floating-toolbar-delete-column"
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
            </ToolbarGroup>
          </div>
        </Portal>
      )}
    </Show>
  );
}
