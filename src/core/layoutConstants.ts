// Shared layout/render magic numbers that were previously redefined inline
// across the layout-projection, canvas and PDF layers (audit #24, #25, #26).
// Core-only module: it imports nothing and may be consumed by any layer.

/**
 * Weight applied to the vertical distance when scoring caret/hit-test
 * candidates: a closer line always wins over horizontal proximity. Used by the
 * pagination caret search, the canvas hit-test service and caret geometry.
 */
export const VERTICAL_HIT_WEIGHT = 1000;

/**
 * Fraction of a line's height at which the text baseline sits (top + 80%).
 * Shared by the canvas paragraph painter and the PDF text/list painters so the
 * baseline can never drift between on-screen and exported rendering.
 */
export const TEXT_BASELINE_RATIO = 0.8;

/**
 * Effectively-unbounded width (in CSS px) used to measure content that must not
 * wrap (e.g. table cell intrinsic widths). Single source for the value that was
 * redefined in tablePagination, tableGeometry and the canvas cell prep.
 */
export const NO_WRAP_MEASURE_WIDTH_PX = 100000;

/**
 * Vertical offset (px) to add to a run's text baseline when
 * `w:textAlignment` is set to a non-default value. Returns 0 for
 * `auto`/`baseline`/absent (the common-baseline default) and whenever the run
 * fills the line (font size ≥ line height), so the default layout is never
 * shifted. Only mixed font sizes within one line are affected.
 *
 * The offset reuses {@link TEXT_BASELINE_RATIO} so canvas and PDF stay in sync:
 *  - `top`:    run's own baseline sits at `R * fontSize` from the line top
 *  - `center`: run centered vertically in the line box
 *  - `bottom`: run's descent sits at the line bottom
 */
export function resolveTextAlignmentBaselineOffset(
  textAlignment:
    | "auto"
    | "top"
    | "center"
    | "baseline"
    | "bottom"
    | null
    | undefined,
  fontSizePx: number,
  lineHeightPx: number,
): number {
  if (
    !textAlignment ||
    textAlignment === "auto" ||
    textAlignment === "baseline"
  ) {
    return 0;
  }
  if (fontSizePx >= lineHeightPx) {
    return 0;
  }
  const delta = fontSizePx - lineHeightPx;
  switch (textAlignment) {
    case "top":
      return TEXT_BASELINE_RATIO * delta;
    case "center":
      return (TEXT_BASELINE_RATIO - 0.5) * delta;
    case "bottom":
      return (1 - TEXT_BASELINE_RATIO) * -delta;
    default:
      return 0;
  }
}
