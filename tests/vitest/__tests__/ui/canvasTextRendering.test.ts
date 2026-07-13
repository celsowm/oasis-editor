import { describe, expect, it } from "vitest";
import { DEFAULT_EDITOR_PAGE_SETTINGS } from "@/core/model.js";
import {
  resolveCanvasFooterZoneTop,
  resolveCanvasTextRenderMetrics,
} from "@/ui/components/CanvasEditorSurface.js";
import { resolveFragmentPaintBounds } from "@/ui/canvas/canvasParagraphPainter.js";
import { applyCanvasTextFeatureHints } from "@/ui/canvas/canvasFontResolution.js";
import { getRenderedChar } from "@/ui/canvas/paragraph/canvasTextEffects.js";
import { measureCharacterWidth } from "@/ui/textMeasurement/characterWidth.js";

/**
 * Minimal stand-in exposing the canvas text-feature properties so the
 * feature-detection branches run (jsdom/node ctx may omit them otherwise).
 */
function createFeatureContext(): {
  fontKerning: "auto" | "normal" | "none";
  textRendering:
    | "auto"
    | "optimizeSpeed"
    | "optimizeLegibility"
    | "geometricPrecision";
} {
  return { fontKerning: "auto", textRendering: "auto" };
}

describe("canvas text rendering metrics", () => {
  it("renders Word small caps with full-size capitals and reduced uppercase lowercase letters", () => {
    expect(
      resolveCanvasTextRenderMetrics({ smallCaps: true }, 16, "A"),
    ).toEqual({ fontSize: 16, baselineOffset: -0 });
    expect(
      resolveCanvasTextRenderMetrics({ smallCaps: true }, 16, "a"),
    ).toEqual({ fontSize: 12.8, baselineOffset: -0 });
    expect(getRenderedChar("a", { smallCaps: true })).toBe("A");
    const fullCapital = measureCharacterWidth(
      "A",
      { fontFamily: "Calibri", smallCaps: true },
      16,
    );
    const reducedLowercase = measureCharacterWidth(
      "a",
      { fontFamily: "Calibri", smallCaps: true },
      16,
    );
    expect(reducedLowercase).toBeCloseTo(fullCapital * 0.8, 4);
  });

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
