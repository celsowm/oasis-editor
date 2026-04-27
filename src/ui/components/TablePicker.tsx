import { Component, createSignal, onMount, onCleanup, For, Show } from "solid-js";
import { render, Portal } from "solid-js/web";
import { TablePickerListener } from "../../app/events/ViewEventBindings.js";
import { dropdownManager } from "./DropdownManager.js";
import { useI18n } from "../I18nContext.tsx";

export interface TablePickerProps {
  onTableSelected: (rows: number, cols: number) => void;
  anchor: HTMLElement;
}

export const TablePickerComponent: Component<TablePickerProps> = (props) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = createSignal(false);
  const [highlighted, setHighlighted] = createSignal({ rows: 0, cols: 0 });
  const [dropdownPos, setDropdownPos] = createSignal({ top: 0, left: 0 });

  const closeSelf = () => {
    setIsOpen(false);
  };

  const openSelf = () => {
    dropdownManager.closeAll(closeSelf);
    setIsOpen(true);
  };

  onMount(() => {
    dropdownManager.register(closeSelf);
    onCleanup(() => dropdownManager.unregister(closeSelf));

    const toggle = (e: MouseEvent) => {
      e.stopPropagation();
      if (isOpen()) {
        closeSelf();
      } else {
        openSelf();
        const rect = props.anchor.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
        });
        setHighlighted({ rows: 0, cols: 0 });
      }
    };

    props.anchor.addEventListener("click", toggle);

    return () => {
      props.anchor.removeEventListener("click", toggle);
    };
  });

  const selectTable = (rows: number, cols: number, e: MouseEvent) => {
    e.stopPropagation();
    props.onTableSelected(rows, cols);
    closeSelf();
  };

  return (
    <Show when={isOpen()}>
      <Portal>
        <div
          class="oasis-table-picker-dropdown show"
          style={{
            top: `${dropdownPos().top}px`,
            left: `${dropdownPos().left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div class="oasis-table-picker-info">
            {t("messages", "tableInfo", highlighted().rows, highlighted().cols)}
          </div>
          <div class="oasis-table-picker-grid">
            <For each={Array.from({ length: 100 })}>
              {(_, i) => {
                const r = Math.floor(i() / 10) + 1;
                const c = (i() % 10) + 1;
                return (
                  <div
                    class="oasis-table-picker-cell"
                    classList={{
                      highlight: r <= highlighted().rows && c <= highlighted().cols,
                    }}
                    onMouseOver={() => setHighlighted({ rows: r, cols: c })}
                    onClick={(e) => selectTable(r, c, e)}
                  ></div>
                );
              }}
            </For>
          </div>
        </div>
      </Portal>
    </Show>
  );
};

export const TablePickerInline: Component<{ onTableSelected: (rows: number, cols: number) => void }> = (props) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = createSignal(false);
  const [highlighted, setHighlighted] = createSignal({ rows: 0, cols: 0 });
  const [dropdownPos, setDropdownPos] = createSignal({ top: 0, left: 0 });
  let buttonRef: HTMLButtonElement | undefined;

  const closeSelf = () => setIsOpen(false);

  const openSelf = () => {
    dropdownManager.closeAll(closeSelf);
    setIsOpen(true);
  };

  const toggle = (e: MouseEvent) => {
    e.stopPropagation();
    if (isOpen()) {
      closeSelf();
    } else {
      openSelf();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX,
      });
      setHighlighted({ rows: 0, cols: 0 });
    }
  };

  onMount(() => {
    dropdownManager.register(closeSelf);
    onCleanup(() => dropdownManager.unregister(closeSelf));
  });

  const selectTable = (rows: number, cols: number, e: MouseEvent) => {
    e.stopPropagation();
    props.onTableSelected(rows, cols);
    closeSelf();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        class="oasis-toolbar-btn"
        title={t("toolbar", "insertTable")}
        onClick={toggle}
        style={{ padding: 0, width: "28px", height: "28px", display: "flex", "align-items": "center", "justify-content": "center" }}
      >
        <i data-lucide="table" style={{ width: "16px", height: "16px" }}></i>
      </button>
      <Show when={isOpen()}>
        <Portal>
          <div
            class="oasis-table-picker-dropdown show"
            style={{
              top: `${dropdownPos().top}px`,
              left: `${dropdownPos().left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div class="oasis-table-picker-info">
               {t("messages", "tableInfo", highlighted().rows, highlighted().cols)}
            </div>
            <div class="oasis-table-picker-grid">
              <For each={Array.from({ length: 100 })}>
                {(_, i) => {
                  const r = Math.floor(i() / 10) + 1;
                  const c = (i() % 10) + 1;
                  return (
                    <div
                      class="oasis-table-picker-cell"
                      classList={{
                        highlight: r <= highlighted().rows && c <= highlighted().cols,
                      }}
                      onMouseOver={() => setHighlighted({ rows: r, cols: c })}
                      onClick={(e) => selectTable(r, c, e)}
                    ></div>
                  );
                }}
              </For>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
};
