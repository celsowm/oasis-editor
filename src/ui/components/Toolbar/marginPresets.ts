import type { TranslationKey } from "@/i18n/index.js";
import {
  MARGIN_PRESETS as CORE_MARGIN_PRESETS,
  type MarginPreset as CoreMarginPreset,
} from "@/core/commands/pageSetup.js";
import { PX_PER_CM } from "@/core/units.js";
import { roundTo } from "@/utils/round.js";

/** Convert a centimetre measurement to a rounded pixel value. */
export function cmToPx(cm: number): number {
  return Math.round(cm * PX_PER_CM);
}

/** Convert pixels back to centimetres (for display in the custom form). */
export function pxToCm(px: number): number {
  return roundTo(px / PX_PER_CM, 2);
}

export interface MarginPreset extends CoreMarginPreset {
  labelKey: TranslationKey;
}

/**
 * Word's built-in page-margin presets. The numeric values (cm) are owned by
 * the core `pageSetup` command; this UI layer only adds the i18n label key so
 * the exact numbers stay in one place (single source of truth).
 */
export const MARGIN_PRESETS: MarginPreset[] = CORE_MARGIN_PRESETS.map(
  (preset): MarginPreset => ({
    ...preset,
    labelKey: `section.marginPreset.${preset.id}` as TranslationKey,
  }),
);

/** Preset margins converted to the px units stored on the page settings. */
export function presetMarginsPx(preset: MarginPreset): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  return {
    top: cmToPx(preset.top),
    bottom: cmToPx(preset.bottom),
    left: cmToPx(preset.left),
    right: cmToPx(preset.right),
  };
}

/** True when the current px margins match this preset (±1px tolerance). */
export function marginsMatchPreset(
  margins: { top: number; bottom: number; left: number; right: number },
  preset: MarginPreset,
): boolean {
  const target = presetMarginsPx(preset);
  return (
    Math.abs(margins.top - target.top) <= 1 &&
    Math.abs(margins.bottom - target.bottom) <= 1 &&
    Math.abs(margins.left - target.left) <= 1 &&
    Math.abs(margins.right - target.right) <= 1
  );
}
