import { createSignal, onCleanup, onMount, Show, createEffect, For } from "solid-js";
import { Portal } from "solid-js/web";
import { t } from "../../../i18n/index.js";

const MAX_ROWS = 10;
const MAX_COLS = 10;

export interface TableGridPickerProps {
  onSelect: (rows: number, cols: number) => void;
  tooltip?: string;
  testId?: string;
}

export function TableGridPicker(props: TableGridPickerProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });
  const [hover, setHover] = createSignal<{ row: number; col: number }>({ row: 0, col: 0 });
  let buttonRef: HTMLButtonElement | undefined;
  let menuRef: HTMLDivElement | undefined;

  const close = () => {
    setIsOpen(false);
    setHover({ row: 0, col: 0 });
  };

  const updateCoords = () => {
    if (buttonRef && isOpen()) {
      const rect = buttonRef.getBoundingClientRect();
      const menuWidth = menuRef?.offsetWidth || 240;
      const viewportPadding = 8;
      const preferredLeft = rect.left + window.scrollX;
      const maxLeft = window.scrollX + window.innerWidth - menuWidth - viewportPadding;
      setCoords({
        top: rect.bottom + window.scrollY,
        left: Math.max(window.scrollX + viewportPadding, Math.min(preferredLeft, maxLeft)),
      });
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      buttonRef &&
      !buttonRef.contains(event.target as Node) &&
      menuRef &&
      !menuRef.contains(event.target as Node)
    ) {
      close();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isOpen()) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    const cur = hover();
    let row = cur.row || 1;
    let col = cur.col || 1;
    let handled = true;
    switch (event.key) {
      case "ArrowRight":
        col = Math.min(MAX_COLS, col + 1);
        break;
      case "ArrowLeft":
        col = Math.max(1, col - 1);
        break;
      case "ArrowDown":
        row = Math.min(MAX_ROWS, row + 1);
        break;
      case "ArrowUp":
        row = Math.max(1, row - 1);
        break;
      case "Enter":
        event.preventDefault();
        if (cur.row > 0 && cur.col > 0) {
          props.onSelect(cur.row, cur.col);
          close();
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
    if (isOpen()) {
      updateCoords();
      requestAnimationFrame(updateCoords);
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("keydown", handleKeyDown);
    }
  });

  onMount(() => {
    window.addEventListener("mousedown", handleClickOutside);
  });

  onCleanup(() => {
    window.removeEventListener("mousedown", handleClickOutside);
    window.removeEventListener("resize", updateCoords);
    window.removeEventListener("scroll", updateCoords, true);
    window.removeEventListener("keydown", handleKeyDown);
  });

  const rows = () => Array.from({ length: MAX_ROWS }, (_, i) => i + 1);
  const cols = () => Array.from({ length: MAX_COLS }, (_, i) => i + 1);
  const tooltip = () => props.tooltip || t("toolbar.table");
  const statusLabel = () => {
    const h = hover();
    if (h.row === 0 || h.col === 0) {
      return t("toolbar.table");
    }
    return `${h.row} × ${h.col}`;
  };

  return (
    <div class="oasis-editor-toolbar-dropdown">
      <button
        ref={buttonRef}
        type="button"
        class="oasis-editor-tool-button"
        classList={{ "oasis-editor-tool-button-active": isOpen() }}
        onClick={() => {
          if (isOpen()) {
            close();
          } else {
            setIsOpen(true);
          }
        }}
        title={tooltip()}
        aria-label={tooltip()}
        data-testid={props.testId}
      >
        <i data-lucide="table" />
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div
            ref={menuRef}
            class="oasis-editor-table-grid-picker"
            style={{
              position: "absolute",
              top: `${coords().top + 4}px`,
              left: `${coords().left}px`,
            }}
            onMouseLeave={() => setHover({ row: 0, col: 0 })}
          >
            <div class="oasis-editor-table-grid-picker-status">{statusLabel()}</div>
            <div
              class="oasis-editor-table-grid-picker-grid"
              style={{
                "grid-template-columns": `repeat(${MAX_COLS}, 18px)`,
                "grid-template-rows": `repeat(${MAX_ROWS}, 18px)`,
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
                        onClick={() => {
                          props.onSelect(r, c);
                          close();
                        }}
                        aria-label={`${r} × ${c}`}
                      />
                    )}
                  </For>
                )}
              </For>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  );
}
