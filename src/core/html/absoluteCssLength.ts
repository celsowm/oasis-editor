import { PX_PER_CM, PX_PER_INCH, PX_PER_POINT } from "@/core/units.js";

const PIXELS_PER_UNIT: Record<string, number> = {
  px: 1,
  pt: PX_PER_POINT,
  pc: 12 * PX_PER_POINT,
  in: PX_PER_INCH,
  cm: PX_PER_CM,
  mm: PX_PER_CM / 10,
  q: PX_PER_CM / 40,
};

/** Resolve a nonnegative absolute CSS length without depending on host styles. */
export function absoluteCssLengthToPx(value: string): number | undefined {
  const match = value
    .trim()
    .match(
      /^([+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?)(px|pt|pc|in|cm|mm|q)$/i,
    );
  if (!match) return undefined;
  const pixels = Number(match[1]) * PIXELS_PER_UNIT[match[2]!.toLowerCase()]!;
  return Number.isFinite(pixels) ? pixels : undefined;
}
