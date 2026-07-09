import type { EditorLineDash } from "./model/types/primitives.js";

/**
 * Canonical dash patterns for DrawingML `a:prstDash` presets, expressed in
 * typographic points. This is the single source of truth shared by every
 * renderer: the canvas scales them by `PX_PER_POINT` for `setLineDash`, the PDF
 * exporter feeds them straight to the `d` operator, and the DOCX serializer
 * needs no numbers at all (it writes the preset name back out verbatim).
 *
 * `solid` is the empty pattern — a continuous line in both backends.
 */
export const LINE_DASH_PATTERN_PT: Record<EditorLineDash, number[]> = {
  solid: [],
  dot: [0.75, 2.25],
  sysDot: [0.75, 0.75],
  dash: [3.75, 2.25],
  sysDash: [2.25, 2.25],
  dashDot: [3.75, 2.25, 0.75, 2.25],
  lgDash: [6, 2.25],
  lgDashDot: [6, 2.25, 0.75, 2.25],
  lgDashDotDot: [6, 2.25, 0.75, 2.25, 0.75, 2.25],
};

const DASH_VALUES: ReadonlySet<string> = new Set(
  Object.keys(LINE_DASH_PATTERN_PT),
);

/** Narrows an untrusted `a:prstDash/@val` to a supported preset. */
export function parseLineDash(
  value: string | null | undefined,
): EditorLineDash | undefined {
  return value && DASH_VALUES.has(value)
    ? (value as EditorLineDash)
    : undefined;
}

/** Dash pattern for a border, in points. Empty for solid/undefined. */
export function lineDashPatternPt(dash: EditorLineDash | undefined): number[] {
  return LINE_DASH_PATTERN_PT[dash ?? "solid"];
}
