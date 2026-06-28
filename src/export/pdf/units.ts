import type { EditorTextStyle } from "@/core/model.js";
import { PT_PER_PX, DEFAULT_FONT_SIZE_PX } from "@/core/units.js";

/** Points per pixel (72 / 96). Named PX_TO_PT for historical call sites. */
export const PX_TO_PT = PT_PER_PX;
export { DEFAULT_FONT_SIZE_PX }; // 11pt (Calibri default)

export function pxToPt(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value * PX_TO_PT;
}

export function ptToPx(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value / PX_TO_PT;
}

export function textStyleToFontSizePt(
  style: Required<EditorTextStyle>,
): number {
  return pxToPt(style.fontSize ?? DEFAULT_FONT_SIZE_PX);
}
