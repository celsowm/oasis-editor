import type { EditorTextStyle } from "@/core/model.js";

export const PX_TO_PT = 72 / 96;
export const DEFAULT_FONT_SIZE_PX = 14.6667; // 11pt (Calibri default)

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
