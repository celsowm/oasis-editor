/** Half-spacing between the two lines of a double-strikethrough, in px. */
export const DOUBLE_STRIKE_OFFSET_PX = 1.3;
/** Half-spacing between the two lines of a double-underline, in px. */
export const DOUBLE_UNDERLINE_OFFSET_PX = 1.5;

/**
 * Resolves the Y coordinate of the decoration line for a given kind, relative
 * to the page/canvas origin. Shared between the Canvas and PDF renderers so
 * both produce the same geometry.
 */
export function resolveDecorationLineY(
  kind: "underline" | "strike" | "doubleStrike",
  lineTop: number,
  lineHeight: number,
): number {
  if (kind === "underline") return lineTop + lineHeight - 2;
  if (kind === "doubleStrike") return lineTop + lineHeight * 0.5;
  return lineTop + lineHeight * 0.52;
}
