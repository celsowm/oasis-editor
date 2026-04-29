import { describe, expect, it } from "vitest";
import {
  getCaretSlotRects,
  measureLinesFromRects,
  resolveClosestOffsetForBoundaryLine,
  resolveClosestOffsetFromRects,
} from "../../ui/caretGeometry.js";

describe("caretGeometry", () => {
  it("builds insertion slots from character rects", () => {
    const slots = getCaretSlotRects([
      { left: 10, right: 20, top: 50, bottom: 70, height: 20 },
      { left: 20, right: 30, top: 50, bottom: 70, height: 20 },
    ]);

    expect(slots).toEqual([
      { left: 10, top: 50, height: 20 },
      { left: 20, top: 50, height: 20 },
      { left: 30, top: 50, height: 20 },
    ]);
  });

  it("resolves the closest offset across wrapped lines", () => {
    const charRects = [
      { left: 10, right: 20, top: 10, bottom: 30, height: 20 },
      { left: 20, right: 30, top: 10, bottom: 30, height: 20 },
      { left: 10, right: 20, top: 40, bottom: 60, height: 20 },
      { left: 20, right: 30, top: 40, bottom: 60, height: 20 },
    ];

    expect(resolveClosestOffsetFromRects(charRects, 9, 12)).toBe(0);
    expect(resolveClosestOffsetFromRects(charRects, 28, 12)).toBe(2);
    expect(resolveClosestOffsetFromRects(charRects, 9, 45)).toBe(2);
    expect(resolveClosestOffsetFromRects(charRects, 21, 45)).toBe(3);
    expect(resolveClosestOffsetFromRects(charRects, 29, 45)).toBe(4);
  });

  it("resolves offsets on the first or last visual line for vertical navigation", () => {
    const charRects = [
      { left: 10, right: 20, top: 10, bottom: 30, height: 20 },
      { left: 20, right: 30, top: 10, bottom: 30, height: 20 },
      { left: 10, right: 20, top: 40, bottom: 60, height: 20 },
      { left: 20, right: 30, top: 40, bottom: 60, height: 20 },
    ];

    expect(resolveClosestOffsetForBoundaryLine(charRects, 9, "first")).toBe(0);
    expect(resolveClosestOffsetForBoundaryLine(charRects, 28, "first")).toBe(2);
    expect(resolveClosestOffsetForBoundaryLine(charRects, 9, "last")).toBe(2);
    expect(resolveClosestOffsetForBoundaryLine(charRects, 29, "last")).toBe(4);
  });

  it("measures explicit visual lines with local slot ranges", () => {
    const charRects = [
      { left: 10, right: 20, top: 10, bottom: 30, height: 20 },
      { left: 20, right: 30, top: 10, bottom: 30, height: 20 },
      { left: 10, right: 20, top: 40, bottom: 60, height: 20 },
      { left: 20, right: 30, top: 40, bottom: 60, height: 20 },
    ];

    const lines = measureLinesFromRects(charRects);

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      index: 0,
      startOffset: 0,
      endOffset: 2,
      top: 10,
      height: 20,
    });
    expect(lines[0]?.slots.map((slot) => slot.offset)).toEqual([0, 1, 2]);
    expect(lines[1]).toMatchObject({
      index: 1,
      startOffset: 2,
      endOffset: 4,
      top: 40,
      height: 20,
    });
    expect(lines[1]?.slots.map((slot) => slot.offset)).toEqual([2, 3, 4]);
  });
});
