import { describe, expect, it } from "vitest";
import { DEFAULT_EDITOR_PAGE_SETTINGS } from "../../../../src/core/model.js";
import {
  resolveCanvasFooterZoneTop,
  resolveCanvasTextRenderMetrics,
} from "../../../../src/ui/components/CanvasEditorSurface.js";
import { resolveFragmentPaintBounds } from "../../../../src/ui/canvas/canvasParagraphPainter.js";

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

  it("extends run background painting to the caret slot after a wide final glyph", () => {
    const line = {
      paragraphId: "p1",
      index: 0,
      startOffset: 0,
      endOffset: 6,
      top: 0,
      height: 20,
      slots: [
        { paragraphId: "p1", offset: 0, left: 0, top: 0, height: 20 },
        { paragraphId: "p1", offset: 1, left: 14, top: 0, height: 20 },
        { paragraphId: "p1", offset: 2, left: 28, top: 0, height: 20 },
        { paragraphId: "p1", offset: 3, left: 42, top: 0, height: 20 },
        { paragraphId: "p1", offset: 4, left: 56, top: 0, height: 20 },
        { paragraphId: "p1", offset: 5, left: 68, top: 0, height: 20 },
        { paragraphId: "p1", offset: 6, left: 84, top: 0, height: 20 },
      ],
      fragments: [],
    };
    const fragment = {
      paragraphId: "p1",
      runId: "r1",
      startOffset: 0,
      endOffset: 6,
      text: "wewerw",
      chars: [..."wewerw"].map((char, index) => ({
        char,
        paragraphOffset: index,
        runOffset: index,
      })),
    };

    expect(resolveFragmentPaintBounds(line, fragment)).toEqual({
      left: 0,
      right: 84,
    });
  });
});
