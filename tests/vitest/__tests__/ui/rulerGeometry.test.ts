import { describe, it, expect } from "vitest";
import {
  computeRulerGeometry,
  computeRulerTicks,
  resolveFirstLineOffset,
  PX_PER_INCH,
  tabPositionToPageX,
  rulerPointerToTabPosition,
} from "@/ui/components/Ruler/rulerGeometry.js";
import type { EditorPageSettings } from "@/core/model.js";

const LETTER: EditorPageSettings = {
  width: 816,
  height: 1056,
  orientation: "portrait",
  margins: {
    top: 96,
    right: 96,
    bottom: 96,
    left: 96,
    header: 48,
    footer: 48,
    gutter: 0,
  },
};

const NO_INDENTS = {
  indentLeft: 0,
  indentRight: 0,
  indentFirstLine: 0,
  indentHanging: 0,
};

describe("ruler geometry", () => {
  it("computes content zone from page margins (px)", () => {
    const geo = computeRulerGeometry(LETTER, NO_INDENTS);
    expect(geo.contentLeft).toBe(96);
    expect(geo.contentRight).toBe(720);
    expect(geo.contentRight - geo.contentLeft).toBe(624);
  });

  it("folds the gutter into the left content edge", () => {
    const geo = computeRulerGeometry(
      { ...LETTER, margins: { ...LETTER.margins, gutter: 48 } },
      NO_INDENTS,
    );
    expect(geo.contentLeft).toBe(144);
    expect(geo.gutter).toBe(48);
  });

  it("positions indent markers relative to the content edges", () => {
    const geo = computeRulerGeometry(LETTER, {
      indentLeft: 48,
      indentRight: 24,
      indentFirstLine: 36,
      indentHanging: 0,
    });
    expect(geo.leftIndentX).toBe(96 + 48);
    expect(geo.firstLineX).toBe(96 + 48 + 36);
    expect(geo.rightIndentX).toBe(720 - 24);
  });

  it("treats a hanging indent as a negative first-line offset", () => {
    const offset = resolveFirstLineOffset({ ...NO_INDENTS, indentHanging: 30 });
    expect(offset).toBe(-30);
    const geo = computeRulerGeometry(LETTER, {
      indentLeft: 48,
      indentRight: 0,
      indentFirstLine: 0,
      indentHanging: 30,
    });
    expect(geo.firstLineX).toBe(96 + 48 - 30);
  });

  it("emits a labeled major tick every inch with 0 at the content edge", () => {
    const ticks = computeRulerTicks(LETTER.width, 96, "in");
    const oneInch = ticks.find(
      (t) => t.x === 96 + PX_PER_INCH && t.kind === "major",
    );
    expect(oneInch?.label).toBe("1");
    const origin = ticks.find((t) => t.x === 96 && t.kind === "major");
    expect(origin?.label).toBeUndefined();
  });
});

describe("ruler tab positions", () => {
  it("maps points to document pixels independently of paragraph indents", () => {
    expect(tabPositionToPageX(36, 96)).toBe(144);
  });
  it("roundtrips screen coordinates at 50, 100 and 200 percent zoom", () => {
    for (const zoom of [0.5, 1, 2]) {
      const x = 40 + 144 * zoom;
      expect(rulerPointerToTabPosition(x, 40, zoom, 96, 720, "in")).toBe(36);
    }
  });
  it("snaps to ruler subdivisions and allows Alt-style free placement", () => {
    expect(rulerPointerToTabPosition(149, 0, 1, 96, 720, "in")).toBe(36);
    expect(rulerPointerToTabPosition(149, 0, 1, 96, 720, "in", true)).toBe(39.75);
    expect(rulerPointerToTabPosition(10, 0, 1, 96, 720, "in")).toBe(0);
  });
});
