export const POINTS_PER_PIXEL = 0.75;
export const PIXELS_PER_POINT = 1 / POINTS_PER_PIXEL;
export const MIN_TABLE_SIZE_PT = 10;

export function pxToPt(px: number): number {
  return px * POINTS_PER_PIXEL;
}

export function ptToPx(pt: number): number {
  return pt * PIXELS_PER_POINT;
}

export function parseSizeToPt(
  value: number | string | undefined,
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  if (trimmed.endsWith("pt")) {
    const parsed = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (trimmed.endsWith("px")) {
    const parsed = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(parsed) ? pxToPt(parsed) : null;
  }
  if (trimmed.includes("%")) {
    return null;
  }
  if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
