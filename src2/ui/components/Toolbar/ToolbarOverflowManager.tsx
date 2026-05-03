import { createSignal, onCleanup, onMount, For, type JSX, Show, createMemo, children, createEffect } from "solid-js";
import { ToolbarDropdown } from "./ToolbarDropdown.js";

export function ToolbarOverflowManager(props: { children: JSX.Element }) {
  const [overflowCount, setOverflowCount] = createSignal(0);
  let containerRef: HTMLDivElement | undefined;
  let measurementRef: HTMLDivElement | undefined;

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
    if (itemElements.length === 0) {
      setOverflowCount(0);
      return;
    }

    const GAP = 8;
    const MORE_BUTTON_WIDTH = 56;
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
      class="oasis-editor-2-toolbar-overflow-manager" 
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
          {(item) => <div style={{ display: 'flex', "align-items": 'center' }}>{item}</div>}
        </For>
      </div>

      {/* 2. Real Visible Toolbar */}
      <div style={{ display: 'flex', "align-items": 'center', gap: '8px', "flex-shrink": 0 }}>
        <For each={visibleItems()}>
          {(item) => <div class="oasis-editor-2-toolbar-item-wrapper" style={{ display: 'flex', "align-items": 'center' }}>{item}</div>}
        </For>
      </div>

      {/* 3. Overflow Dropdown */}
      <Show when={overflowCount() > 0}>
        <div style={{ "margin-left": "auto", "flex-shrink": 0, "padding-left": "8px" }}>
          <ToolbarDropdown 
            label="" 
            icon="more-horizontal" 
            testId="editor-2-toolbar-overflow-dropdown"
            tooltip="More tools"
          >
            <div class="oasis-editor-2-toolbar-overflow-menu" style={{ 
              display: "flex", 
              "flex-direction": "column", 
              gap: "8px", 
              padding: "8px" 
            }}>
                <For each={hiddenItems()}>
                  {(item) => (
                    <div class="oasis-editor-2-toolbar-overflow-item">
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
