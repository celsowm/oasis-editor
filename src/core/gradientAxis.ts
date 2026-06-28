const DEG_TO_RAD = Math.PI / 180;

/**
 * Resolves the start/end endpoints of a linear gradient axis centered on the
 * given bounding box and rotated by `angleDeg` degrees. Both the Canvas and
 * PDF renderers use the same axis so gradients look identical across outputs.
 */
export function resolveGradientAxis(
  boxX0: number,
  boxY0: number,
  boxX1: number,
  boxY1: number,
  angleDeg: number,
): { x0: number; y0: number; x1: number; y1: number } {
  const cx = (boxX0 + boxX1) / 2;
  const cy = (boxY0 + boxY1) / 2;
  const rad = angleDeg * DEG_TO_RAD;
  const dx = (Math.cos(rad) * (boxX1 - boxX0)) / 2;
  const dy = (Math.sin(rad) * (boxY1 - boxY0)) / 2;
  return { x0: cx - dx, y0: cy - dy, x1: cx + dx, y1: cy + dy };
}
