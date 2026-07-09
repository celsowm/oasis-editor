import type { EditorLineDash } from "@/core/model.js";
import { lineDashPatternPt } from "@/core/lineDash.js";
import type { TranslationKey } from "@/i18n/index.js";

/** Border weights offered by Word's Picture Border ▸ Weight submenu, in points. */
export const PICTURE_BORDER_WEIGHTS_PT: number[] = [
  0.25, 0.5, 0.75, 1, 1.5, 2.25, 3, 4.5, 6,
];

/** `0.25` → `"¼"`, `1.5` → `"1½"`, `3` → `"3"`. */
export function formatBorderWeight(widthPt: number): string {
  const whole = Math.floor(widthPt);
  const fraction = widthPt - whole;
  const glyph =
    fraction === 0.25
      ? "¼"
      : fraction === 0.5
        ? "½"
        : fraction === 0.75
          ? "¾"
          : "";
  if (!glyph) {
    return String(whole);
  }
  return whole === 0 ? glyph : `${whole}${glyph}`;
}

export interface PictureBorderDashOption {
  value: EditorLineDash;
  labelKey: TranslationKey;
}

/** Ordered as Word's Dashes flyout: shortest pattern first. */
export const PICTURE_BORDER_DASH_OPTIONS: PictureBorderDashOption[] = [
  { value: "solid", labelKey: "image.borderDash.solid" },
  { value: "sysDot", labelKey: "image.borderDash.sysDot" },
  { value: "sysDash", labelKey: "image.borderDash.sysDash" },
  { value: "dot", labelKey: "image.borderDash.dot" },
  { value: "dash", labelKey: "image.borderDash.dash" },
  { value: "dashDot", labelKey: "image.borderDash.dashDot" },
  { value: "lgDash", labelKey: "image.borderDash.lgDash" },
  { value: "lgDashDot", labelKey: "image.borderDash.lgDashDot" },
  { value: "lgDashDotDot", labelKey: "image.borderDash.lgDashDotDot" },
];

/**
 * `stroke-dasharray` for a menu preview stroke, derived from the same point
 * table the canvas and PDF renderers use — so a preview can never disagree with
 * what gets painted. Solid yields `undefined` (no attribute).
 */
export function dashPreviewArray(dash: EditorLineDash): string | undefined {
  const pattern = lineDashPatternPt(dash);
  return pattern.length > 0 ? pattern.join(" ") : undefined;
}
