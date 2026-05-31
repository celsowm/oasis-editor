import { describe, expect, it } from "vitest";
import { resolveCanvasTextRenderMetrics } from "../../ui/components/CanvasEditorSurface.js";

describe("canvas text rendering metrics", () => {
  it("renders superscript smaller and above the normal baseline", () => {
    const metrics = resolveCanvasTextRenderMetrics({ superscript: true }, 16);

    expect(metrics.fontSize).toBeLessThan(16);
    expect(metrics.baselineOffset).toBeLessThan(0);
  });

  it("renders subscript smaller and below the normal baseline", () => {
    const metrics = resolveCanvasTextRenderMetrics({ subscript: true }, 16);

    expect(metrics.fontSize).toBeLessThan(16);
    expect(metrics.baselineOffset).toBeGreaterThan(0);
  });
});
