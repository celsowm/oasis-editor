import { describe, expect, it } from "vitest";
import {
  MARGIN_PRESETS,
  cmToPx,
  marginsMatchPreset,
  presetMarginsPx,
  pxToCm,
} from "@/ui/components/Toolbar/marginPresets.js";

describe("margin presets", () => {
  it("converts centimetres to pixels at 96 DPI", () => {
    // 2.54 cm == 1 inch == 96 px
    expect(cmToPx(2.54)).toBe(96);
    expect(cmToPx(1.27)).toBe(48);
    expect(cmToPx(0)).toBe(0);
  });

  it("round-trips px back to cm for the custom form", () => {
    expect(pxToCm(96)).toBeCloseTo(2.54, 2);
    expect(pxToCm(cmToPx(3))).toBeCloseTo(3, 1);
  });

  it("exposes the five Word presets with the pt-BR Normal values", () => {
    const ids = MARGIN_PRESETS.map((p) => p.id);
    expect(ids).toEqual(["normal", "narrow", "moderate", "wide", "mirrored"]);
    const normal = MARGIN_PRESETS[0]!;
    expect(normal).toMatchObject({ top: 2.5, bottom: 2.5, left: 3, right: 3 });
  });

  it("produces full four-sided px margins for a preset", () => {
    const wide = MARGIN_PRESETS.find((p) => p.id === "wide")!;
    expect(presetMarginsPx(wide)).toEqual({
      top: 96,
      bottom: 96,
      left: 192,
      right: 192,
    });
  });

  it("matches the active preset within a 1px tolerance", () => {
    const moderate = MARGIN_PRESETS.find((p) => p.id === "moderate")!;
    const px = presetMarginsPx(moderate);
    expect(marginsMatchPreset(px, moderate)).toBe(true);
    expect(marginsMatchPreset({ ...px, left: px.left + 5 }, moderate)).toBe(
      false,
    );
    // A different preset must not match.
    const narrow = MARGIN_PRESETS.find((p) => p.id === "narrow")!;
    expect(marginsMatchPreset(px, narrow)).toBe(false);
  });
});
