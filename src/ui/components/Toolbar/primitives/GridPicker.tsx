import { For, createEffect, createSignal, onCleanup, type JSX } from "solid-js";
import { Popover } from "./Popover.js";
import { t } from "../../../../i18n/index.js";

export interface GridPickerProps {
  onSelect: (rows: number, cols: number) => void;
  tooltip?: string;
  testId?: string;
  icon?: string;
  maxRows?: number;
  maxCols?: number;
}

/** Hover/keyboard grid size picker (table insertion). Size is configurable. */
export function GridPicker(props: GridPickerProps): JSX.Element {
  const [isOpen, setIsOpen] = createSignal(false);
  const [hover, setHover] = createSignal<{ row: number; col: number }>({
    row: 0,
    col: 0,
  });

  const maxRows = () => props.maxRows ?? 10;
  const maxCols = () => props.maxCols ?? 10;
  const icon = () => props.icon ?? "table";
  const tooltip = () => props.tooltip || t("toolbar.table");

  const close = () => {
    setIsOpen(false);
    setHover({ row: 0, col: 0 });
  };

  const selectGridSize = (rows: number, cols: number) => {
    close();
    queueMicrotask(() => props.onSelect(rows, cols));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isOpen()) return;
    const cur = hover();
    let row = cur.row || 1;
    let col = cur.col || 1;
    let handled = true;
    switch (event.key) {
      case "ArrowRight":
        col = Math.min(maxCols(), col + 1);
        break;
      case "ArrowLeft":
        col = Math.max(1, col - 1);
        break;
      case "ArrowDown":
        row = Math.min(maxRows(), row + 1);
        break;
      case "ArrowUp":
        row = Math.max(1, row - 1);
        break;
      case "Enter":
        event.preventDefault();
        if (cur.row > 0 && cur.col > 0) {
          selectGridSize(cur.row, cur.col);
        }
        return;
      default:
        handled = false;
    }
    if (handled) {
      event.preventDefault();
      setHover({ row, col });
    }
  };

  createEffect(() => {
    if (!isOpen()) return;
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  });

  const rows = () => Array.from({ length: maxRows() }, (_, i) => i + 1);
  const cols = () => Array.from({ length: maxCols() }, (_, i) => i + 1);
  const statusLabel = () => {
    const h = hover();
    return h.row === 0 || h.col === 0
      ? t("toolbar.table")
      : `${h.row} × ${h.col}`;
  };

  return (
    <div class="oasis-editor-toolbar-dropdown">
      <Popover
        open={isOpen()}
        onOpenChange={(open) => (open ? setIsOpen(true) : close())}
        panelClass="oasis-editor-table-grid-picker"
        onPanelMouseLeave={() => setHover({ row: 0, col: 0 })}
        trigger={(api) => (
          <button
            ref={(el) => api.ref(el)}
            type="button"
            class="oasis-editor-tool-button"
            classList={{ "oasis-editor-tool-button-active": api.open }}
            onClick={() => api.toggle()}
            title={tooltip()}
            aria-label={tooltip()}
            data-testid={props.testId}
          >
            <i data-lucide={icon()} />
          </button>
        )}
      >
        <div class="oasis-editor-table-grid-picker-status">{statusLabel()}</div>
        <div
          class="oasis-editor-table-grid-picker-grid"
          style={{
            "grid-template-columns": `repeat(${maxCols()}, 18px)`,
            "grid-template-rows": `repeat(${maxRows()}, 18px)`,
          }}
        >
          <For each={rows()}>
            {(r) => (
              <For each={cols()}>
                {(c) => (
                  <button
                    type="button"
                    class="oasis-editor-table-grid-picker-cell"
                    classList={{
                      "oasis-editor-table-grid-picker-cell-active":
                        r <= hover().row && c <= hover().col,
                    }}
                    data-testid={`editor-toolbar-table-grid-${r}x${c}`}
                    onMouseEnter={() => setHover({ row: r, col: c })}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectGridSize(r, c)}
                    aria-label={`${r} × ${c}`}
                  />
                )}
              </For>
            )}
          </For>
        </div>
      </Popover>
    </div>
  );
}
