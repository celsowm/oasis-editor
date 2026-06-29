import { Show, createMemo, type Accessor, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { useI18n } from "@/i18n/I18nContext.js";
import "./floatingToolbar.css";
import type { SelectionBox } from "@/ui/editorUiTypes.js";
import { Button } from "@/ui/components/Toolbar/primitives/Button.js";
import { Separator } from "@/ui/components/Toolbar/primitives/Separator.js";
import { useSurfaceRect } from "@/ui/components/Toolbar/primitives/useSurfaceRect.js";
import type { ToolbarHost } from "@/ui/components/Toolbar/state/createToolbarApi.js";

export interface FloatingTableToolbarProps {
  host: () => ToolbarHost;
  selectionBoxes: Accessor<SelectionBox[]>;
  visible: Accessor<boolean>;
  surfaceRef: () => HTMLElement | undefined;
}

export function FloatingTableToolbar(
  props: FloatingTableToolbarProps,
): JSX.Element {
  const t = useI18n();
  const host = (): ToolbarHost => props.host();
  const run = (command: string, payload?: unknown): unknown =>
    host().commands.execute(command, payload);
  const blocked = (command: string): boolean =>
    !host().commands.state(command).isEnabled;

  const {
    rect: surfaceRect,
    tick,
    refresh: scheduleRefresh,
  } = useSurfaceRect(props.surfaceRef);

  const position = createMemo((): { centerX: number; top: number } | null => {
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
    if (
      !Number.isFinite(left) ||
      !Number.isFinite(top) ||
      !Number.isFinite(right)
    ) {
      return null;
    }
    const viewportCenterX = rect.left + (left + right) / 2;
    const viewportTop = rect.top + top;
    return { centerX: viewportCenterX, top: viewportTop };
  });

  // Re-read surface rect any time visible/selection changes
  createMemo((): void => {
    props.visible();
    props.selectionBoxes();
    if (typeof window !== "undefined") {
      scheduleRefresh();
    }
  });

  return (
    <Show when={position()}>
      {(pos): JSX.Element => (
        <Portal mount={document.body}>
          <div
            class="oasis-editor-floating-toolbar"
            data-testid="editor-floating-table-toolbar"
            style={{
              left: `${pos().centerX}px`,
              top: `${pos().top}px`,
            }}
            onMouseDown={(event): void => event.preventDefault()}
          >
            <div class="oasis-editor-toolbar-group">
              <Button
                icon="combine"
                data-testid="editor-floating-toolbar-merge"
                disabled={blocked("tableMerge")}
                onClick={(): unknown => run("tableMerge")}
                tooltip={t("table.mergeTooltip")}
              />
              <Button
                icon="split"
                data-testid="editor-floating-toolbar-split"
                disabled={blocked("tableSplit")}
                onClick={(): unknown => run("tableSplit")}
                tooltip={t("table.splitTooltip")}
              />
            </div>

            <Separator />

            <div class="oasis-editor-toolbar-group">
              <Button
                icon="align-left"
                data-testid="editor-floating-toolbar-align-left"
                onClick={(): unknown => run("tableAlignLeft")}
                tooltip={t("table.alignLeft")}
              />
              <Button
                icon="align-center"
                data-testid="editor-floating-toolbar-align-center"
                onClick={(): unknown => run("tableAlignCenter")}
                tooltip={t("table.alignCenter")}
              />
              <Button
                icon="align-right"
                data-testid="editor-floating-toolbar-align-right"
                onClick={(): unknown => run("tableAlignRight")}
                tooltip={t("table.alignRight")}
              />
            </div>

            <Separator />

            <div class="oasis-editor-toolbar-group">
              <Button
                icon="palette"
                data-testid="editor-floating-toolbar-shading"
                onClick={(): void => {
                  const color = prompt(t("table.cellBgColorPrompt"), "#f1f5f9");
                  if (color !== null) run("tableCellShading", color);
                }}
                tooltip={t("table.cellColor")}
              />
              <Button
                icon="frame"
                data-testid="editor-floating-toolbar-borders"
                onClick={(): unknown => run("tableCellBorders")}
                tooltip={t("table.applyBorders")}
              />
              <Button
                icon="square"
                data-testid="editor-floating-toolbar-no-borders"
                onClick={(): unknown => run("tableCellNoBorders")}
                tooltip={t("table.removeBorders")}
              />
            </div>

            <Separator />

            <div class="oasis-editor-toolbar-group">
              <Button
                icon="arrow-up-to-line"
                data-testid="editor-floating-toolbar-insert-row-above"
                disabled={blocked("tableInsertRowBefore")}
                onClick={(): unknown => run("tableInsertRowBefore")}
                tooltip={t("table.insertRowAbove")}
              />
              <Button
                icon="arrow-down-to-line"
                data-testid="editor-floating-toolbar-insert-row-below"
                disabled={blocked("tableInsertRowAfter")}
                onClick={(): unknown => run("tableInsertRowAfter")}
                tooltip={t("table.insertRowBelow")}
              />
              <Button
                icon="arrow-left-to-line"
                data-testid="editor-floating-toolbar-insert-column-left"
                disabled={blocked("tableInsertColumnBefore")}
                onClick={(): unknown => run("tableInsertColumnBefore")}
                tooltip={t("table.insertColumnLeft")}
              />
              <Button
                icon="arrow-right-to-line"
                data-testid="editor-floating-toolbar-insert-column-right"
                disabled={blocked("tableInsertColumnAfter")}
                onClick={(): unknown => run("tableInsertColumnAfter")}
                tooltip={t("table.insertColumnRight")}
              />
            </div>

            <Separator />

            <div class="oasis-editor-toolbar-group">
              <Button
                icon="rows-3"
                data-testid="editor-floating-toolbar-delete-row"
                disabled={blocked("tableDeleteRow")}
                onClick={(): unknown => run("tableDeleteRow")}
                tooltip={t("table.deleteRow")}
              />
              <Button
                icon="columns-3"
                data-testid="editor-floating-toolbar-delete-column"
                disabled={blocked("tableDeleteColumn")}
                onClick={(): unknown => run("tableDeleteColumn")}
                tooltip={t("table.deleteColumn")}
              />
            </div>
          </div>
        </Portal>
      )}
    </Show>
  );
}
