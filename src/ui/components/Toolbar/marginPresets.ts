import type { TranslationKey } from "@/i18n/index.js";
import { PX_PER_CM as CM_TO_PX } from "@/core/units.js";

/** Convert a centimetre measurement to a rounded pixel value. */
export function cmToPx(cm: number): number {
  return Math.round(cm * CM_TO_PX);
}

/** Convert pixels back to centimetres (for display in the custom form). */
export function pxToCm(px: number): number {
  return Math.round((px / CM_TO_PX) * 100) / 100;
}

export interface MarginPreset {
  id: string;
  labelKey: TranslationKey;
  /** Margins in centimetres, mirroring Word's presets. */
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Word's built-in page-margin presets (values shown in the screenshot use the
 * pt-BR localisation: "Normal" follows ABNT 2.5/2.5/3/3 cm rather than 1 inch).
 */
export const MARGIN_PRESETS: MarginPreset[] = [
  {
    id: "normal",
    labelKey: "section.marginPreset.normal",
    top: 2.5,
    bottom: 2.5,
    left: 3,
    right: 3,
  },
  {
    id: "narrow",
    labelKey: "section.marginPreset.narrow",
    top: 1.27,
    bottom: 1.27,
    left: 1.27,
    right: 1.27,
  },
  {
    id: "moderate",
    labelKey: "section.marginPreset.moderate",
    top: 2.54,
    bottom: 2.54,
    left: 1.91,
    right: 1.91,
  },
  {
    id: "wide",
    labelKey: "section.marginPreset.wide",
    top: 2.54,
    bottom: 2.54,
    left: 5.08,
    right: 5.08,
  },
  {
    id: "mirrored",
    labelKey: "section.marginPreset.mirrored",
    top: 2.54,
    bottom: 2.54,
    left: 3.18,
    right: 2.54,
  },
];

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
