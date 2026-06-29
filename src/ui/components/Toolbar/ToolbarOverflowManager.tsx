import {
  createSignal,
  onCleanup,
  onMount,
  For,
  type JSX,
  createMemo,
  children,
  createEffect,
} from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";

/**
 * Manages toolbar overflow by imperatively moving DOM nodes between
 * a visible strip and a hidden overflow menu.
 *
 * Why imperative? Because moving real DOM nodes preserves SolidJS event
 * listeners and internal component state (like open dropdowns) without
 * triggering unmount/remount cycles.
 */
export function ToolbarOverflowManager(props: { children: JSX.Element }): JSX.Element {
  const t = useI18n();
  const [overflowCount, setOverflowCount] = createSignal(0);
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [panelWidth, setPanelWidth] = createSignal<number | null>(null);

  let containerRef: HTMLDivElement | undefined;
  let stripRef: HTMLDivElement | undefined;
  let overflowMenuRef: HTMLDivElement | undefined;
  let moreButtonRef: HTMLButtonElement | undefined;
  let moreMeasureRef: HTMLButtonElement | undefined;

  const resolved = children((): JSX.Element => props.children);
  const items = createMemo(() =>
    resolved.toArray().filter((i): boolean => i !== null && i !== undefined),
  );

  /** Pull all item wrappers back into the strip for fresh measurement */
  const collectAllToStrip = (): void => {
    if (!stripRef || !overflowMenuRef) return;
    const ofs = Array.from(overflowMenuRef.children) as HTMLElement[];
    for (const w of ofs) {
      w.style.display = "";
      stripRef.appendChild(w);
    }
  };

  const updateOverflow = (): void => {
    if (!stripRef || !containerRef || !moreMeasureRef) return;

    // Give browser a frame to stabilize before measurement
    requestAnimationFrame((): void => {
      collectAllToStrip();

      const containerWidth = containerRef!.getBoundingClientRect().width;
      const moreButtonWidth =
        moreMeasureRef!.getBoundingClientRect().width || 40;
      const wrappers = Array.from(stripRef!.children) as HTMLElement[];

      if (wrappers.length === 0) {
        setOverflowCount(0);
        return;
      }

      // Ensure all items are visible for measurement
      wrappers.forEach((w): void => {
        w.style.display = "flex";
        w.style.visibility = "visible";
      });

      const itemWidths = wrappers.map((el): number => el.getBoundingClientRect().width);
      const EDGE_PADDING = 8;
      const GAP = 8;

      // 1. Check if EVERYTHING fits WITHOUT the "..." button
      const totalAll = itemWidths.reduce(
        (sum, w, i): number => sum + w + (i > 0 ? GAP : 0),
        0,
      );

      let visibleCount = itemWidths.length;

      if (totalAll > containerWidth - EDGE_PADDING) {
        // We need the "..." button. Re-calculate space.
        const availableWidth =
          containerWidth - moreButtonWidth - GAP * 2 - EDGE_PADDING;
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
        if (
          visibleCount > 0 &&
          wrappers[visibleCount - 1].querySelector(
            ".oasis-editor-toolbar-separator",
          )
        ) {
          visibleCount--;
        }
      }

      setOverflowCount(itemWidths.length - visibleCount);

      // Imperatively move overflowing items
      wrappers.forEach((w, index): void => {
        if (index < visibleCount) {
          stripRef!.appendChild(w);
        } else {
          overflowMenuRef?.appendChild(w);
        }
      });
    });
  };

  // Measurement triggers
  createEffect((): void => {
    items();
    // Run multiple times during stabilization
    setTimeout(updateOverflow, 50);
    setTimeout(updateOverflow, 300);
    setTimeout(updateOverflow, 1000);
  });

  /**
   * Measure the panel's natural single-line width (no wrapping) and clamp it
   * to the available horizontal space. The result is the actual width we apply
   * to the panel — items only wrap when content truly does not fit.
   */
  const remeasurePanel = (): void => {
    if (!overflowMenuRef || !moreButtonRef) return;
    const el = overflowMenuRef;

    // Force single-line layout for accurate intrinsic measurement
    const prev = {
      flexWrap: el.style.flexWrap,
      width: el.style.width,
      maxWidth: el.style.maxWidth,
      display: el.style.display,
      visibility: el.style.visibility,
    };
    el.style.display = "flex";
    el.style.visibility = "hidden";
    el.style.flexWrap = "nowrap";
    el.style.width = "max-content";
    el.style.maxWidth = "none";
    const natural = Math.ceil(el.getBoundingClientRect().width);
    el.style.flexWrap = prev.flexWrap;
    el.style.width = prev.width;
    el.style.maxWidth = prev.maxWidth;
    el.style.display = prev.display;
    el.style.visibility = prev.visibility;

    const r = moreButtonRef.getBoundingClientRect();
    const vw = window.innerWidth;
    // Horizontal space available between the viewport's left edge (with 8px
    // margin) and the right edge of the "..." button.
    const available = Math.max(160, Math.min(vw - 16, r.right - 8));
    setPanelWidth(Math.min(natural, available));
  };

  onMount((): void => {
    const observer = new ResizeObserver((): void => {
      updateOverflow();
      if (menuOpen()) requestAnimationFrame(remeasurePanel);
    });
    observer.observe(containerRef!);

    const handleOutsideClick = (e: MouseEvent): void => {
      if (
        menuOpen() &&
        moreButtonRef &&
        !moreButtonRef.contains(e.target as Node) &&
        overflowMenuRef &&
        !overflowMenuRef.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    const handleWindowResize = (): void => {
      if (menuOpen()) requestAnimationFrame(remeasurePanel);
    };

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("resize", handleWindowResize);
    onCleanup((): void => {
      observer.disconnect();
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("resize", handleWindowResize);
    });
  });

  // Re-measure whenever the menu opens or the overflow set changes
  createEffect((): void => {
    if (menuOpen() && overflowCount() > 0) {
      // Run after layout settles
      requestAnimationFrame((): number => requestAnimationFrame(remeasurePanel));
    }
  });

  // Position the overflow popover below the "..." button.
  // We anchor to the right edge of the "..." button and apply the explicitly
  // measured panel width so the panel only wraps when content cannot fit.
  const menuStyle = (): {} => {
    if (!moreButtonRef) return {};
    const r = moreButtonRef.getBoundingClientRect();
    const vw = window.innerWidth;
    const w = panelWidth();

    return {
      position: "fixed" as const,
      top: `${r.bottom + 4}px`,
      right: `${Math.max(8, vw - r.right)}px`,
      "z-index": 1000,
      ...(w !== null ? { width: `${w}px` } : {}),
    };
  };

  return (
    <div
      ref={containerRef}
      class="oasis-editor-toolbar-overflow-manager"
      style={{
        display: "flex",
        "align-items": "center",
        flex: "1 1 0%",
        "min-width": "0",
        position: "relative",
        "margin-right": "8px",
      }}
    >
      {/* Ghost button — measures "..." width only, never visible */}
      <button
        ref={moreMeasureRef}
        type="button"
        class="oasis-editor-tool-button oasis-editor-tool-button-dropdown oasis-editor-toolbar-more-measure"
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: "absolute",
          visibility: "hidden",
          "pointer-events": "none",
          right: 0,
        }}
      >
        <i data-lucide="ellipsis" />
      </button>

      {/* Visible strip */}
      <div
        ref={stripRef}
        style={{
          display: "flex",
          "align-items": "center",
          gap: "8px",
          flex: "1 1 0",
          "min-width": "0",
          overflow: "hidden",
        }}
      >
        <For each={items()}>
          {(item): JSX.Element => (
            <div
              class="oasis-editor-toolbar-item-wrapper"
              style={{
                display: "flex",
                "align-items": "center",
                "flex-shrink": 0,
              }}
            >
              {item}
            </div>
          )}
        </For>
      </div>

      {/* "..." button — display:none when not needed so it doesn't steal flex space */}
      <div
        style={{
          "flex-shrink": 0,
          "padding-left": "8px",
          "padding-right": "16px",
          display: overflowCount() > 0 ? "flex" : "none",
          "align-items": "center",
        }}
      >
        <button
          ref={moreButtonRef}
          type="button"
          class="oasis-editor-tool-button oasis-editor-tool-button-dropdown"
          classList={{ "oasis-editor-tool-button-active": menuOpen() }}
          onClick={(): boolean => setMenuOpen((o): boolean => !o)}
          title={t("toolbar.moreTools")}
          aria-label={t("toolbar.moreTools")}
          data-testid="editor-toolbar-overflow-dropdown"
        >
          <i data-lucide="ellipsis" />
        </button>
      </div>

      {/* Overflow panel — Items are moved here imperatively.
          The panel width is measured via JS (`remeasurePanel`) so it hugs the
          natural content width when it fits, and snaps to the available space
          (wrapping to 2+ rows) when the viewport is too narrow. */}
      <div
        ref={overflowMenuRef}
        class="oasis-editor-toolbar-overflow-dropdown-menu oasis-editor-toolbar-overflow-menu"
        style={{
          ...menuStyle(),
          display: menuOpen() && overflowCount() > 0 ? "flex" : "none",
          "flex-direction": "row",
          "flex-wrap": "wrap",
          "align-items": "center",
          gap: "4px",
          padding: "8px",
          background: "var(--oasis-paper)",
          border: "1px solid var(--oasis-toolbar-border)",
          "border-radius": "var(--oasis-radius)",
          "box-shadow": "0 4px 12px rgba(0, 0, 0, 0.15)",
          "max-width": "calc(100vw - 16px)",
          "overflow-x": "hidden",
          "overflow-y": "auto",
        }}
        onClick={(e): void => {
          // Close when a tool button is clicked (but not nested dropdowns)
          if (
            (e.target as HTMLElement).closest("button") &&
            !(e.target as HTMLElement).closest(
              ".oasis-editor-tool-button-dropdown",
            )
          ) {
            setMenuOpen(false);
          }
        }}
      />
    </div>
  );
}
