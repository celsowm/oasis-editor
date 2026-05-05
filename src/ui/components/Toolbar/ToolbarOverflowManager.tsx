import { createSignal, onCleanup, onMount, For, type JSX, Show, createMemo, children, createEffect } from "solid-js";
import { ToolbarDropdown } from "./ToolbarDropdown.js";
import { t } from "../../../i18n/index.js";

export function ToolbarOverflowManager(props: { children: JSX.Element }) {
  const [overflowCount, setOverflowCount] = createSignal(0);
  const [docsMode, setDocsMode] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;
  let measurementRef: HTMLDivElement | undefined;

  const resolved = children(() => props.children);
  const items = createMemo(() => resolved.toArray().filter(i => i !== null && i !== undefined));

  const updateOverflow = () => {
    if (!containerRef || !measurementRef) return;

    const isDocs = Boolean(containerRef.closest(".oasis-editor-docs"));
    setDocsMode(isDocs);
    if (isDocs) {
      setOverflowCount(0);
      return;
    }

    const containerWidth = containerRef.clientWidth;
    if (containerWidth <= 0) {
      setOverflowCount(0);
      return;
    }

    const itemElements = Array.from(measurementRef.children) as HTMLElement[];
    if (itemElements.length === 0) {
      setOverflowCount(0);
      return;
    }

    const GAP = 8;
    // Width reserved for the absolutely-positioned overflow button on the right.
    // Must match the padding-right applied to the visible items wrapper below.
    const MORE_BUTTON_WIDTH = 96;
    const MIN_VISIBLE = 3;

    let currentWidth = 0;
    let newOverflowCount = 0;

    for (let i = 0; i < itemElements.length; i++) {
      const elWidth = itemElements[i].offsetWidth;
      // If element is not ready, assume a reasonable width to prevent collapse
      const itemWidth = (elWidth > 0 ? elWidth : 120) + GAP;

      if (i >= MIN_VISIBLE && currentWidth + itemWidth + MORE_BUTTON_WIDTH > containerWidth) {
        newOverflowCount = itemElements.length - i;
        break;
      }
      currentWidth += itemWidth;
    }

    setOverflowCount(newOverflowCount);
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
  const hiddenItems = createMemo(() => items().slice(items().length - overflowCount()));

  return (
    <div 
      ref={containerRef} 
      class="oasis-editor-toolbar-overflow-manager" 
      style={{
        display: 'flex',
        "align-items": 'center',
        width: '100%',
        overflow: docsMode() ? 'auto' : 'hidden',
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
          {(item) => <div style={{ display: 'flex', "align-items": 'center' }}>{item}</div>}
        </For>
      </div>

      {/* 2. Real Visible Toolbar — flex:1 with min-width:0 so it shares
           space cleanly with the overflow button sibling. */}
      <div style={{
        display: 'flex',
        "align-items": 'center',
        gap: '8px',
        flex: '1 1 0',
        "min-width": '0',
        overflow: docsMode() ? 'visible' : 'hidden'
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
          "padding-left": "8px"
        }}>
          <ToolbarDropdown 
            label="" 
            icon="ellipsis" 
            testId="editor-toolbar-overflow-dropdown"
            tooltip={t("toolbar.moreTools")}
          >
            <div class="oasis-editor-toolbar-overflow-menu" style={{ 
              display: "flex", 
              "flex-direction": "column", 
              gap: "8px", 
              padding: "8px" 
            }}>
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
