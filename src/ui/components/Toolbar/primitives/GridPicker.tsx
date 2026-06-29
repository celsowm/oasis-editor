import { For, createEffect, createSignal, onCleanup, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Popover } from "./Popover.js";

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
  const t = useI18n();
  const [isOpen, setIsOpen] = createSignal(false);
  const [hover, setHover] = createSignal<{ row: number; col: number }>({
    row: 0,
    col: 0,
  });

  const maxRows = (): number => props.maxRows ?? 10;
  const maxCols = (): number => props.maxCols ?? 10;
  const icon = (): string => props.icon ?? "table";
  const tooltip = (): string => props.tooltip || t("toolbar.table");

  const close = (): void => {
    setIsOpen(false);
    setHover({ row: 0, col: 0 });
  };

  const selectGridSize = (rows: number, cols: number): void => {
    close();
    queueMicrotask((): void => props.onSelect(rows, cols));
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
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

  createEffect((): void => {
    if (!isOpen()) return;
    window.addEventListener("keydown", handleKeyDown);
    onCleanup((): void => window.removeEventListener("keydown", handleKeyDown));
  });

  const rows = (): number[] => Array.from({ length: maxRows() }, (_, i): number => i + 1);
  const cols = (): number[] => Array.from({ length: maxCols() }, (_, i): number => i + 1);
  const statusLabel = (): string => {
    const h = hover();
    return h.row === 0 || h.col === 0
      ? t("toolbar.table")
      : `${h.row} × ${h.col}`;
  };

  return (
    <div class="oasis-editor-toolbar-dropdown">
      <Popover
        open={isOpen()}
        onOpenChange={(open): true | void => (open ? setIsOpen(true) : close())}
        panelClass="oasis-editor-table-grid-picker"
        onPanelMouseLeave={(): { row: number; col: number; } => setHover({ row: 0, col: 0 })}
        trigger={(api): JSX.Element => (
          <button
            ref={(el): void => api.ref(el)}
            type="button"
            class="oasis-editor-tool-button"
            classList={{ "oasis-editor-tool-button-active": api.open }}
            onClick={(): void => api.toggle()}
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
            {(r): JSX.Element => (
              <For each={cols()}>
                {(c): JSX.Element => (
                  <button
                    type="button"
                    class="oasis-editor-table-grid-picker-cell"
                    classList={{
                      "oasis-editor-table-grid-picker-cell-active":
                        r <= hover().row && c <= hover().col,
                    }}
                    data-testid={`editor-toolbar-table-grid-${r}x${c}`}
                    onMouseEnter={(): { row: number; col: number; } => setHover({ row: r, col: c })}
                    onMouseDown={(event): void => event.preventDefault()}
                    onClick={(): void => selectGridSize(r, c)}
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
