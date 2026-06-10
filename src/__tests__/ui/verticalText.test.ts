import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "../../core/editorState.js";
import {
  estimateStackedColumnWidth,
  layoutStackedGlyphs,
  projectRotatedPoint,
  projectRotatedSlot,
  resolveVerticalMode,
} from "../../ui/canvas/verticalText.js";

function stateWith(text: string) {
  const paragraph = createEditorParagraph(text);
  const state = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
  return { paragraph, state };
}

describe("resolveVerticalMode", () => {
  it("maps OOXML/DrawingML direction tokens to render modes like Word", () => {
    // Rotated 90° clockwise. `tbRlV` renders like `tbRl` for Latin text.
    expect(resolveVerticalMode("tbRl")).toBe("rotate-cw");
    expect(resolveVerticalMode("tbRlV")).toBe("rotate-cw");
    expect(resolveVerticalMode("vert")).toBe("rotate-cw");
    // Rotated 90° counter-clockwise.
    expect(resolveVerticalMode("btLr")).toBe("rotate-ccw");
    expect(resolveVerticalMode("vert270")).toBe("rotate-ccw");
    // Only WordArt vertical stacks glyphs upright.
    expect(resolveVerticalMode("wordArtVert")).toBe("stack");
    // `lrTbV` and plain `lrTb` render as horizontal Latin text.
    expect(resolveVerticalMode("lrTbV")).toBe("horizontal");
    expect(resolveVerticalMode("lrTb")).toBe("horizontal");
    expect(resolveVerticalMode(null)).toBe("horizontal");
  });
});

describe("layoutStackedGlyphs", () => {
  it("emits one slot per non-newline glyph with the paragraph offsets", () => {
    const { paragraph, state } = stateWith("AB\nCD");
    const box = { x: 0, y: 0, width: 100, height: 1000 };
    const { glyphs } = layoutStackedGlyphs(paragraph, state, box, box.width);

    expect(glyphs.map((g) => g.char)).toEqual(["A", "B", "C", "D"]);
    // The "\n" at offset 2 is skipped; offsets stay aligned to paragraph text.
    expect(glyphs.map((g) => g.offset)).toEqual([0, 1, 3, 4]);
  });

  it("stacks glyphs downward within a column and advances columns right-to-left", () => {
    const { paragraph, state } = stateWith("AB\nCD");
    const box = { x: 0, y: 0, width: 100, height: 1000 };
    const { glyphs } = layoutStackedGlyphs(paragraph, state, box, box.width);

    // Same column: monotonically increasing top.
    expect(glyphs[1]!.top).toBeGreaterThan(glyphs[0]!.top);
    // New column after the hard break advances left (East-Asian RTL columns).
    expect(glyphs[2]!.centerX).toBeLessThan(glyphs[0]!.centerX);
    // Each new column resets to the top of the box.
    expect(glyphs[2]!.top).toBeCloseTo(glyphs[0]!.top, 6);
  });

  it("advances columns left-to-right from the left edge when not RTL", () => {
    // wordArtVert (Word's "Stacked" Latin text) flows columns left→right.
    const { paragraph, state } = stateWith("AB\nCD");
    const box = { x: 0, y: 0, width: 100, height: 1000 };
    const { glyphs } = layoutStackedGlyphs(paragraph, state, box, box.x, false);

    // First column sits at the left edge; the next column advances rightward.
    expect(glyphs[0]!.centerX).toBeLessThan(box.width / 2);
    expect(glyphs[2]!.centerX).toBeGreaterThan(glyphs[0]!.centerX);
    expect(glyphs[2]!.top).toBeCloseTo(glyphs[0]!.top, 6);
  });

  it("reports a positive natural column width", () => {
    const { paragraph, state } = stateWith("AB");
    expect(estimateStackedColumnWidth(paragraph, state)).toBeGreaterThan(15);
  });
});

describe("projectRotatedPoint", () => {
  const box = { x: 10, y: 20, width: 100, height: 200 };

  it("maps the local layout space onto the box for clockwise rotation", () => {
    expect(projectRotatedPoint(box, "rotate-cw", 0, 0)).toEqual({
      x: 110,
      y: 20,
    });
    expect(projectRotatedPoint(box, "rotate-cw", 200, 100)).toEqual({
      x: 10,
      y: 220,
    });
  });

  it("maps the local layout space onto the box for counter-clockwise rotation", () => {
    expect(projectRotatedPoint(box, "rotate-ccw", 0, 0)).toEqual({
      x: 10,
      y: 220,
    });
    expect(projectRotatedPoint(box, "rotate-ccw", 200, 100)).toEqual({
      x: 110,
      y: 20,
    });
  });
});

describe("projectRotatedSlot", () => {
  const box = { x: 10, y: 20, width: 100, height: 200 };

  it("produces a screen rectangle whose height is the glyph advance", () => {
    const cw = projectRotatedSlot(box, "rotate-cw", 0, 0, 10, 18);
    expect(cw).toEqual({ left: 10 + 100 - 9, top: 20, height: 10 });

    const ccw = projectRotatedSlot(box, "rotate-ccw", 0, 0, 10, 18);
    expect(ccw).toEqual({ left: 10 + 9, top: 20 + 200 - 10, height: 10 });
  });
});
