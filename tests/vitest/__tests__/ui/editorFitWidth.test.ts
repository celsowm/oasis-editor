import { describe, expect, it } from "vitest";
import { calculateFitWidthZoom } from "../../../../src/ui/app/editorZoom.js";

describe("fit-width zoom", () => {
  it("waits for valid dimensions and rejects invalid gutters", () => {
    expect(calculateFitWidthZoom(0, 794, 4)).toBeNull();
    expect(calculateFitWidthZoom(600, 0, 4)).toBeNull();
    expect(calculateFitWidthZoom(600, 794, -1)).toBeNull();
  });
  it("rounds down to fit and includes both gutters", () => {
    expect(calculateFitWidthZoom(600, 794, 4)).toBe(74);
    expect(calculateFitWidthZoom(802, 794, 4)).toBe(100);
    expect(calculateFitWidthZoom(1200, 794, 4)).toBe(100);
  });
  it("preserves the existing minimum for extremely narrow panels", () => {
    expect(calculateFitWidthZoom(200, 794, 4)).toBe(50);
  });
});
