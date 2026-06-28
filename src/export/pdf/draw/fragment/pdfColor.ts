import { parseHexColorToRgb255, rgb255ToHex } from "@/core/color.js";

// Blends a hex color (#RRGGBB) toward white by (1 - alpha) to simulate
// reduced-opacity text on a white background in PDF (which has no text alpha).
export function blendColorWithWhite(hex: string, alpha: number): string {
  const rgb = parseHexColorToRgb255(hex);
  if (!rgb) return hex;
  const a = Math.max(0, Math.min(1, alpha));
  return rgb255ToHex(
    255 + (rgb[0] - 255) * a,
    255 + (rgb[1] - 255) * a,
    255 + (rgb[2] - 255) * a,
  );
}
