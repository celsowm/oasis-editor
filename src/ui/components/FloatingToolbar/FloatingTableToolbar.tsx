import { Show, createMemo, createSignal, onCleanup, onMount, type Accessor, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import "./floatingToolbar.css";
import type { SelectionBox } from "../../editorUiTypes.js";
import { Button } from "../Toolbar/primitives/Button.js";
import { Separator } from "../Toolbar/primitives/Separator.js";
import type { ToolbarHost } from "../Toolbar/state/createToolbarApi.js";
import { t } from "../../../i18n/index.js";

export interface FloatingTableToolbarProps {
  host: () => ToolbarHost;
  selectionBoxes: Accessor<SelectionBox[]>;
  visible: Accessor<boolean>;
  surfaceRef: () => HTMLElement | undefined;
}

export function FloatingTableToolbar(
  props: FloatingTableToolbarProps,
): JSX.Element {
  const host = () => props.host();
  const run = (command: string, payload?: unknown) => host().commands.execute(command, payload);
  const blocked = (command: string) => !host().commands.state(command).isEnabled;

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
            <div class="oasis-editor-toolbar-group">
              <Button
                icon="combine"
                data-testid="editor-floating-toolbar-merge"
                disabled={blocked("tableMerge")}
                onClick={() => run("tableMerge")}
                tooltip={t("table.mergeTooltip")}
              />
              <Button
                icon="split"
                data-testid="editor-floating-toolbar-split"
                disabled={blocked("tableSplit")}
                onClick={() => run("tableSplit")}
                tooltip={t("table.splitTooltip")}
              />
            </div>

            <Separator />

            <div class="oasis-editor-toolbar-group">
              <Button
                icon="align-left"
                data-testid="editor-floating-toolbar-align-left"
                onClick={() => run("tableAlignLeft")}
                tooltip={t("table.alignLeft")}
              />
              <Button
                icon="align-center"
                data-testid="editor-floating-toolbar-align-center"
                onClick={() => run("tableAlignCenter")}
                tooltip={t("table.alignCenter")}
              />
              <Button
                icon="align-right"
                data-testid="editor-floating-toolbar-align-right"
                onClick={() => run("tableAlignRight")}
                tooltip={t("table.alignRight")}
              />
            </div>

            <Separator />

            <div class="oasis-editor-toolbar-group">
              <Button
                icon="palette"
                data-testid="editor-floating-toolbar-shading"
                onClick={() => {
                  const color = prompt(t("table.cellBgColorPrompt"), "#f1f5f9");
                  if (color !== null) run("tableCellShading", color);
                }}
                tooltip={t("table.cellColor")}
              />
              <Button
                icon="frame"
                data-testid="editor-floating-toolbar-borders"
                onClick={() => run("tableCellBorders")}
                tooltip={t("table.applyBorders")}
              />
              <Button
                icon="square"
                data-testid="editor-floating-toolbar-no-borders"
                onClick={() => run("tableCellNoBorders")}
                tooltip={t("table.removeBorders")}
              />
            </div>

            <Separator />

            <div class="oasis-editor-toolbar-group">
              <Button
                icon="arrow-up-to-line"
                data-testid="editor-floating-toolbar-insert-row-above"
                disabled={blocked("tableInsertRowBefore")}
                onClick={() => run("tableInsertRowBefore")}
                tooltip={t("table.insertRowAbove")}
              />
              <Button
                icon="arrow-down-to-line"
                data-testid="editor-floating-toolbar-insert-row-below"
                disabled={blocked("tableInsertRowAfter")}
                onClick={() => run("tableInsertRowAfter")}
                tooltip={t("table.insertRowBelow")}
              />
              <Button
                icon="arrow-left-to-line"
                data-testid="editor-floating-toolbar-insert-column-left"
                disabled={blocked("tableInsertColumnBefore")}
                onClick={() => run("tableInsertColumnBefore")}
                tooltip={t("table.insertColumnLeft")}
              />
              <Button
                icon="arrow-right-to-line"
                data-testid="editor-floating-toolbar-insert-column-right"
                disabled={blocked("tableInsertColumnAfter")}
                onClick={() => run("tableInsertColumnAfter")}
                tooltip={t("table.insertColumnRight")}
              />
            </div>

            <Separator />

            <div class="oasis-editor-toolbar-group">
              <Button
                icon="rows-3"
                data-testid="editor-floating-toolbar-delete-row"
                disabled={blocked("tableDeleteRow")}
                onClick={() => run("tableDeleteRow")}
                tooltip={t("table.deleteRow")}
              />
              <Button
                icon="columns-3"
                data-testid="editor-floating-toolbar-delete-column"
                disabled={blocked("tableDeleteColumn")}
                onClick={() => run("tableDeleteColumn")}
                tooltip={t("table.deleteColumn")}
              />
            </div>
          </div>
        </Portal>
      )}
    </Show>
  );
}
