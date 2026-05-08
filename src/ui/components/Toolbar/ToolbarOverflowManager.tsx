import { createSignal, onCleanup, onMount, For, type JSX, createMemo, children, createEffect } from "solid-js";
import { t } from "../../../i18n/index.js";

/**
 * Manages toolbar overflow by imperatively moving DOM nodes between 
 * a visible strip and a hidden overflow menu.
 * 
 * Why imperative? Because moving real DOM nodes preserves SolidJS event 
 * listeners and internal component state (like open dropdowns) without 
 * triggering unmount/remount cycles.
 */
export function ToolbarOverflowManager(props: { children: JSX.Element }) {
  const [overflowCount, setOverflowCount] = createSignal(0);
  const [menuOpen, setMenuOpen] = createSignal(false);
  
  let containerRef: HTMLDivElement | undefined;
  let stripRef: HTMLDivElement | undefined;
  let overflowMenuRef: HTMLDivElement | undefined;
  let moreButtonRef: HTMLButtonElement | undefined;
  let moreMeasureRef: HTMLButtonElement | undefined;

  const resolved = children(() => props.children);
  const items = createMemo(() => resolved.toArray().filter(i => i !== null && i !== undefined));

  /** Pull all item wrappers back into the strip for fresh measurement */
  const collectAllToStrip = () => {
    if (!stripRef || !overflowMenuRef) return;
    const ofs = Array.from(overflowMenuRef.children) as HTMLElement[];
    for (const w of ofs) {
      w.style.display = '';
      stripRef.appendChild(w);
    }
  };

  const updateOverflow = () => {
    if (!stripRef || !containerRef || !moreMeasureRef) return;

    // Give browser a frame to stabilize before measurement
    requestAnimationFrame(() => {
      collectAllToStrip();

      const containerWidth = containerRef!.getBoundingClientRect().width;
      const moreButtonWidth = moreMeasureRef!.getBoundingClientRect().width || 40;
      const wrappers = Array.from(stripRef!.children) as HTMLElement[];

      if (wrappers.length === 0) {
        setOverflowCount(0);
        return;
      }

      // Ensure all items are visible for measurement
      wrappers.forEach(w => {
        w.style.display = 'flex';
        w.style.visibility = 'visible';
      });

      const itemWidths = wrappers.map(el => el.getBoundingClientRect().width);
      const EDGE_PADDING = 8;
      const GAP = 8;

      // 1. Check if EVERYTHING fits WITHOUT the "..." button
      const totalAll = itemWidths.reduce((sum, w, i) => sum + w + (i > 0 ? GAP : 0), 0);
      
      let visibleCount = itemWidths.length;

      if (totalAll > containerWidth - EDGE_PADDING) {
        // We need the "..." button. Re-calculate space.
        const availableWidth = containerWidth - moreButtonWidth - (GAP * 2) - EDGE_PADDING;
        visibleCount = 0;
        let currentX = 0;
        
        for (let i = 0; i < itemWidths.length; i++) {
          const w = itemWidths[i];
          const needed = w + (visibleCount > 0 ? GAP : 0);
          if (currentX + needed <= availableWidth) {
            currentX += needed;
            visibleCount++;
          } else {
            break;
          }
        }
        
        // Prevent ending on a lone separator if possible
        if (visibleCount > 0 && wrappers[visibleCount - 1].querySelector('.oasis-editor-toolbar-separator')) {
          visibleCount--;
        }
      }

      setOverflowCount(itemWidths.length - visibleCount);

      // Imperatively move overflowing items
      wrappers.forEach((w, index) => {
        if (index < visibleCount) {
          stripRef!.appendChild(w);
        } else {
          overflowMenuRef?.appendChild(w);
        }
      });
    });
  };

  // Measurement triggers
  createEffect(() => {
    items();
    // Run multiple times during stabilization
    setTimeout(updateOverflow, 50);
    setTimeout(updateOverflow, 300);
    setTimeout(updateOverflow, 1000);
  });

  onMount(() => {
    const observer = new ResizeObserver(() => updateOverflow());
    observer.observe(containerRef!);
    
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuOpen() && moreButtonRef && !moreButtonRef.contains(e.target as Node) && 
          overflowMenuRef && !overflowMenuRef.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    
    window.addEventListener('mousedown', handleOutsideClick);
    onCleanup(() => {
      observer.disconnect();
      window.removeEventListener('mousedown', handleOutsideClick);
    });
  });

  // Position the overflow popover below the "..." button
  const menuStyle = () => {
    if (!moreButtonRef) return {};
    const r = moreButtonRef.getBoundingClientRect();
    const vw = window.innerWidth;
    
    return {
      position: 'fixed' as const,
      top: `${r.bottom + 4}px`,
      right: `${vw - r.right}px`,
      "z-index": 1000,
      "min-width": "max-content",
    };
  };

  return (
    <div
      ref={containerRef}
      class="oasis-editor-toolbar-overflow-manager"
      style={{ 
        display: 'flex', 
        "align-items": 'center', 
        flex: '1 1 0%',
        "min-width": '0',
        position: 'relative',
        "margin-right": '8px'
      }}
    >
      {/* Ghost button — measures "..." width only, never visible */}
      <button
        ref={moreMeasureRef}
        type="button"
        class="oasis-editor-tool-button oasis-editor-tool-button-dropdown oasis-editor-toolbar-more-measure"
        aria-hidden="true"
        tabIndex={-1}
        style={{ position: 'absolute', visibility: 'hidden', "pointer-events": 'none', right: 0 }}
      >
        <i data-lucide="ellipsis" />
      </button>

      {/* Visible strip */}
      <div
        ref={stripRef}
        style={{ display: 'flex', "align-items": 'center', gap: '8px', flex: '1 1 0', "min-width": '0', overflow: 'hidden' }}
      >
        <For each={items()}>
          {(item) => (
            <div class="oasis-editor-toolbar-item-wrapper" style={{ display: 'flex', "align-items": 'center', "flex-shrink": 0 }}>
              {item}
            </div>
          )}
        </For>
      </div>

      {/* "..." button — display:none when not needed so it doesn't steal flex space */}
      <div style={{ "flex-shrink": 0, "padding-left": "8px", "padding-right": "16px", display: overflowCount() > 0 ? 'flex' : 'none', "align-items": 'center' }}>
        <button
          ref={moreButtonRef}
          type="button"
          class="oasis-editor-tool-button oasis-editor-tool-button-dropdown"
          classList={{ "oasis-editor-tool-button-active": menuOpen() }}
          onClick={() => setMenuOpen(o => !o)}
          title={t("toolbar.moreTools")}
          aria-label={t("toolbar.moreTools")}
          data-testid="editor-toolbar-overflow-dropdown"
        >
          <i data-lucide="ellipsis" />
        </button>
      </div>

      {/* Overflow panel — Items are moved here imperatively. Prefer single-line layout. */}
      <div
        ref={overflowMenuRef}
        class="oasis-editor-toolbar-overflow-dropdown-menu oasis-editor-toolbar-overflow-menu"
        style={{
          ...menuStyle(),
          display: menuOpen() && overflowCount() > 0 ? 'flex' : 'none',
          "flex-direction": 'row',
          "flex-wrap": 'nowrap',
          "align-items": 'center',
          gap: '4px',
          padding: '8px',
          background: 'var(--oasis-paper)',
          border: '1px solid var(--oasis-toolbar-border)',
          "border-radius": 'var(--oasis-radius)',
          "box-shadow": '0 4px 12px rgba(0, 0, 0, 0.15)',
          "max-width": 'calc(100vw - 16px)',
          "overflow-x": 'auto'
        }}
        onClick={(e) => {
          // Close when a tool button is clicked (but not nested dropdowns)
          if ((e.target as HTMLElement).closest('button') && 
              !(e.target as HTMLElement).closest(".oasis-editor-tool-button-dropdown")) {
            setMenuOpen(false);
          }
        }}
      />
    </div>
  );
}
