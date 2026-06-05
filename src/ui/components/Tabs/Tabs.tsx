import {
  For,
  createMemo,
  createSignal,
  createUniqueId,
  type JSX,
} from "solid-js";
import "./Tabs.css";

export interface TabsItem {
  id: string;
  label: string;
  panel: JSX.Element;
  disabled?: boolean;
  testId?: string;
}

export interface TabsProps {
  items: TabsItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  ariaLabel?: string;
  class?: string;
}

function findEnabledItem(
  items: TabsItem[],
  startIndex: number,
  direction: 1 | -1,
): TabsItem | undefined {
  if (!items.length) return undefined;
  for (let step = 0; step < items.length; step += 1) {
    const index = (startIndex + step * direction + items.length) % items.length;
    const item = items[index];
    if (item && !item.disabled) return item;
  }
  return undefined;
}

export function Tabs(props: TabsProps) {
  const baseId = createUniqueId();
  const items = createMemo(() => props.items);
  const firstEnabledId = createMemo(
    () => items().find((item) => !item.disabled)?.id ?? items()[0]?.id ?? "",
  );
  const [internalValue, setInternalValue] = createSignal(
    props.defaultValue ?? firstEnabledId(),
  );
  const selectedId = createMemo(
    () => props.value ?? internalValue() ?? firstEnabledId(),
  );
  const selectedItem = createMemo(
    () =>
      items().find((item) => item.id === selectedId() && !item.disabled) ??
      items().find((item) => !item.disabled),
  );
  const rootClass = createMemo(() =>
    ["oasis-editor-tabs", props.class].filter(Boolean).join(" "),
  );
  const tabRefs: HTMLButtonElement[] = [];

  const selectItem = (item: TabsItem | undefined, focus = false) => {
    if (!item || item.disabled) return;
    if (props.value === undefined) {
      setInternalValue(item.id);
    }
    props.onChange?.(item.id);
    if (focus) {
      queueMicrotask(() =>
        tabRefs[
          items().findIndex((candidate) => candidate.id === item.id)
        ]?.focus(),
      );
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }
    event.preventDefault();
    const currentIndex = Math.max(
      0,
      items().findIndex((item) => item.id === selectedItem()?.id),
    );
    if (event.key === "Home")
      return selectItem(findEnabledItem(items(), 0, 1), true);
    if (event.key === "End")
      return selectItem(findEnabledItem(items(), items().length - 1, -1), true);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    selectItem(
      findEnabledItem(items(), currentIndex + direction, direction),
      true,
    );
  };

  return (
    <div class={rootClass()}>
      <div
        class="oasis-editor-tabs-list"
        role="tablist"
        aria-label={props.ariaLabel}
        onKeyDown={handleKeyDown}
      >
        <For each={items()}>
          {(item, index) => {
            const tabId = `${baseId}-${item.id}-tab`;
            const panelId = `${baseId}-${item.id}-panel`;
            return (
              <button
                ref={(element) => {
                  tabRefs[index()] = element;
                }}
                type="button"
                role="tab"
                id={tabId}
                aria-selected={selectedItem()?.id === item.id}
                aria-controls={panelId}
                aria-disabled={item.disabled ? "true" : undefined}
                disabled={item.disabled}
                tabIndex={selectedItem()?.id === item.id ? 0 : -1}
                classList={{
                  "oasis-editor-tabs-tab": true,
                  "is-active": selectedItem()?.id === item.id,
                }}
                data-testid={item.testId}
                onClick={() => selectItem(item)}
              >
                {item.label}
              </button>
            );
          }}
        </For>
      </div>
      <For each={items()}>
        {(item) => (
          <div
            id={`${baseId}-${item.id}-panel`}
            role="tabpanel"
            aria-labelledby={`${baseId}-${item.id}-tab`}
            hidden={selectedItem()?.id !== item.id}
            classList={{
              "oasis-editor-tabs-panel": true,
              "is-active": selectedItem()?.id === item.id,
            }}
          >
            {item.panel}
          </div>
        )}
      </For>
    </div>
  );
}
