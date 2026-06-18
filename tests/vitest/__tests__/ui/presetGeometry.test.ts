import { describe, expect, it } from "vitest";
import {
  SUPPORTED_PRESET_GEOMETRIES,
  getPresetPathSegments,
  isPresetGeometrySupported,
} from "@/layoutProjection/presetGeometry.js";

describe("DrawingML preset geometry", () => {
  it("covers every preset in the ST_ShapeType fixture corpus", () => {
    expect(SUPPORTED_PRESET_GEOMETRIES.size).toBe(187);

    for (const preset of SUPPORTED_PRESET_GEOMETRIES) {
      expect(isPresetGeometrySupported(preset)).toBe(true);
      const segments = getPresetPathSegments(preset, 10, 20, 120, 80);
      expect(segments.length, preset).toBeGreaterThan(0);
      for (const segment of segments) {
        for (const value of Object.values(segment)) {
          if (typeof value === "number") {
            expect(Number.isFinite(value), preset).toBe(true);
          }
        }
      }
    }
  });

  it("keeps an explicit rectangle fallback for unknown presets", () => {
    expect(isPresetGeometrySupported("not-a-preset")).toBe(false);

    expect(getPresetPathSegments("not-a-preset", 0, 0, 100, 50)).toEqual(
      getPresetPathSegments("rect", 0, 0, 100, 50),
    );
  });

  it("does not use the rectangle fallback for representative supported shapes", () => {
    const rect = getPresetPathSegments("rect", 0, 0, 100, 50);

    for (const preset of [
      "line",
      "ellipse",
      "star5",
      "rightArrow",
      "flowChartDecision",
      "wedgeRoundRectCallout",
      "bracePair",
    ]) {
      expect(getPresetPathSegments(preset, 0, 0, 100, 50)).not.toEqual(rect);
    }
  });
});
