import { describe, expect, it } from "vitest";
import { DEFAULT_EDITOR_PAGE_SETTINGS } from "../../core/model.js";
import {
  resolveCanvasFooterZoneTop,
  resolveCanvasTextRenderMetrics,
} from "../../ui/components/CanvasEditorSurface.js";

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

  it("keeps the footer hint starting at the footer zone when footnotes shrink the body", () => {
    const pageSettings = DEFAULT_EDITOR_PAGE_SETTINGS;
    const staticBodyBottom = pageSettings.height - pageSettings.margins.bottom;

    expect(
      resolveCanvasFooterZoneTop({
        pageSettings,
        bodyTop: pageSettings.margins.top,
        footerTop: staticBodyBottom + 32,
      }),
    ).toBe(staticBodyBottom);
  });
});
