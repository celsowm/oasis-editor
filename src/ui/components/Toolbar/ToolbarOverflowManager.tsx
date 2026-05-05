import { createSignal, onCleanup, onMount, For, type JSX, Show, createMemo, children, createEffect } from "solid-js";
import { ToolbarDropdown } from "./ToolbarDropdown.js";
import { t } from "../../../i18n/index.js";

export function ToolbarOverflowManager(props: { children: JSX.Element }) {
  const [overflowCount, setOverflowCount] = createSignal(0);
  const [separatorIndexes, setSeparatorIndexes] = createSignal<Set<number>>(new Set());
  let containerRef: HTMLDivElement | undefined;
  let measurementRef: HTMLDivElement | undefined;
  let moreMeasureRef: HTMLButtonElement | undefined;

  const resolved = children(() => props.children);
  const items = createMemo(() => resolved.toArray().filter(i => i !== null && i !== undefined));

  const updateOverflow = () => {
    if (!containerRef || !measurementRef) return;

    const containerWidth = containerRef.clientWidth;
    if (containerWidth <= 0) {
      setOverflowCount(0);
      return;
    }

    const itemElements = Array.from(measurementRef.children) as HTMLElement[];
    setSeparatorIndexes(new Set(
      itemElements
        .map((element, index) => element.querySelector(".oasis-editor-toolbar-separator") ? index : -1)
        .filter((index) => index >= 0),
    ));
    if (itemElements.length === 0) {
      setOverflowCount(0);
      return;
    }

    const GAP = 8;
    const EDGE_PADDING = 16;
    const MORE_GAP = 16;
    const moreButtonWidth = moreMeasureRef?.offsetWidth || 40;
    const itemWidths = itemElements.map((el) => (el.offsetWidth > 0 ? el.offsetWidth : 120) + GAP);
    const totalWidth = itemWidths.reduce((sum, width) => sum + width, 0);

    if (totalWidth <= containerWidth - EDGE_PADDING) {
      setOverflowCount(0);
      return;
    }

    const availableWidth = Math.max(0, containerWidth - moreButtonWidth - MORE_GAP - EDGE_PADDING);
    const minVisible = Math.min(1, itemElements.length);
    let visibleCount = 0;
    let currentWidth = 0;

    for (let i = 0; i < itemElements.length; i++) {
      const nextWidth = currentWidth + itemWidths[i];
      if (i >= minVisible && nextWidth > availableWidth) {
        break;
      }
      currentWidth = nextWidth;
      visibleCount = i + 1;
    }

    while (
      visibleCount > 1 &&
      itemElements[visibleCount - 1]?.querySelector(".oasis-editor-toolbar-separator")
    ) {
      visibleCount -= 1;
    }

    setOverflowCount(Math.max(0, itemElements.length - visibleCount));
  };

  onMount(() => {
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => requestAnimationFrame(updateOverflow));
      ro.observe(containerRef!);
      onCleanup(() => ro.disconnect());
    } else {
      window.addEventListener('resize', updateOverflow);
      onCleanup(() => window.removeEventListener('resize', updateOverflow));
    }

    setTimeout(updateOverflow, 100);
  });

  createEffect(() => {
    // Re-measure when items change (e.g. table tools appearing)
    items();
    requestAnimationFrame(updateOverflow);
  });

  const visibleItems = createMemo(() => items().slice(0, items().length - overflowCount()));
  const hiddenItems = createMemo(() => {
    const start = items().length - overflowCount();
    const separators = separatorIndexes();
    return items().slice(start).filter((_, index) => !separators.has(start + index));
  });

  return (
    <div 
      ref={containerRef} 
      class="oasis-editor-toolbar-overflow-manager" 
      style={{
        display: 'flex',
        "align-items": 'center',
        width: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 1. Measurement area (invisible) */}
      <div 
        ref={measurementRef} 
        style={{
          position: 'absolute',
          visibility: 'hidden',
          "pointer-events": 'none',
          display: 'flex',
          "white-space": 'nowrap',
          top: 0,
          left: 0
        }}
      >
        <For each={items()}>
          {(item) => (
            <div
              style={{
                display: 'flex',
                "align-items": 'center',
                "flex-shrink": 0,
                "white-space": "nowrap",
              }}
            >
              {item}
            </div>
          )}
        </For>
      </div>
      <button
        ref={moreMeasureRef}
        type="button"
        class="oasis-editor-tool-button oasis-editor-tool-button-dropdown oasis-editor-toolbar-more-measure"
        aria-hidden="true"
        tabIndex={-1}
      >
        <i data-lucide="ellipsis" />
      </button>

      {/* 2. Real Visible Toolbar — flex:1 with min-width:0 so it shares
           space cleanly with the overflow button sibling. */}
      <div style={{
        display: 'flex',
        "align-items": 'center',
        gap: '8px',
        flex: '1 1 0',
        "min-width": '0',
        overflow: 'hidden'
      }}>
        <For each={visibleItems()}>
          {(item) => <div class="oasis-editor-toolbar-item-wrapper" style={{ display: 'flex', "align-items": 'center', "flex-shrink": 0 }}>{item}</div>}
        </For>
      </div>

      {/* 3. Overflow Dropdown — flex sibling with flex-shrink:0 so it
           always reserves its space and is never clipped. */}
      <Show when={overflowCount() > 0}>
        <div style={{
          "flex-shrink": 0,
          "padding-left": "8px",
          "padding-right": "8px"
        }}>
          <ToolbarDropdown 
            label="" 
            icon="ellipsis" 
            testId="editor-toolbar-overflow-dropdown"
            tooltip={t("toolbar.moreTools")}
            hideChevron
            menuClass="oasis-editor-toolbar-overflow-dropdown-menu"
          >
            <div class="oasis-editor-toolbar-overflow-menu">
                <For each={hiddenItems()}>
                  {(item) => (
                    <div class="oasis-editor-toolbar-overflow-item">
                      {item}
                    </div>
                  )}
                </For>
            </div>
          </ToolbarDropdown>
        </div>
      </Show>
    </div>
  );
}
