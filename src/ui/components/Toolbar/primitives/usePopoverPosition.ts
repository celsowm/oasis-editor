import { createEffect, createSignal, onCleanup, type Accessor } from "solid-js";

export type PopoverPlacement = "bottom-start" | "bottom-end";

export interface PopoverPositionOptions {
  /** The element the panel is anchored to. */
  anchor: Accessor<HTMLElement | undefined>;
  /** The floating panel element (used to measure its width for clamping). */
  panel: Accessor<HTMLElement | undefined>;
  /** Whether the popover is currently open. Listeners attach only while open. */
  open: Accessor<boolean>;
  placement?: PopoverPlacement;
  /** Vertical gap between anchor and panel, in px. */
  gap?: number;
  /** Minimum distance from the viewport edges, in px. */
  viewportPadding?: number;
  /** Fallback panel width when it cannot be measured yet, in px. */
  fallbackWidth?: number;
}

export interface PopoverCoords {
  top: number;
  left: number;
}

/**
 * Viewport-aware positioning for a portalled popover panel.
 *
 * Consolidates the `updateCoords` logic that used to be copy-pasted across
 * ColorSplitButton, UnderlineSplitButton, LineSpacingButton, TableGridPicker
 * and ToolbarDropdown. The math is preserved verbatim: anchor below, left
 * clamped into the viewport accounting for the measured panel width.
 */
export function usePopoverPosition(
  options: PopoverPositionOptions,
): Accessor<PopoverCoords> {
  const [coords, setCoords] = createSignal<PopoverCoords>({ top: 0, left: 0 });

  const gap = (): number => options.gap ?? 4;
  const viewportPadding = (): number => options.viewportPadding ?? 8;
  const fallbackWidth = (): number => options.fallbackWidth ?? 240;

  const updateCoords = (): void => {
    const anchor = options.anchor();
    if (!anchor || !options.open()) {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const panelWidth = options.panel()?.offsetWidth || fallbackWidth();
    const pad = viewportPadding();
    const maxLeft = window.scrollX + window.innerWidth - panelWidth - pad;

    const preferredLeft =
      options.placement === "bottom-end"
        ? rect.right + window.scrollX - panelWidth
        : rect.left + window.scrollX;

    setCoords({
      top: rect.bottom + window.scrollY + gap(),
      left: Math.max(window.scrollX + pad, Math.min(preferredLeft, maxLeft)),
    });
  };

  createEffect((): void => {
    if (!options.open()) {
      return;
    }
    updateCoords();
    // A second measure once the panel has rendered gives an accurate width.
    requestAnimationFrame(updateCoords);
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);
    onCleanup((): void => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    });
  });

  return coords;
}
