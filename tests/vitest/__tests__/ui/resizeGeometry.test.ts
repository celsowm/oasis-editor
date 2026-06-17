import { describe, expect, it } from "vitest";
import {
  axisSignForDirection,
  clamp,
  resolveResizedDimensions,
  type ResizeSessionGeometry,
} from "@/ui/resizeGeometry.js";

const geometry = (
  handleDirection: ResizeSessionGeometry["handleDirection"],
  startWidth = 200,
  startHeight = 100,
): ResizeSessionGeometry => ({
  handleDirection,
  startWidth,
  startHeight,
  aspectRatio: startWidth / startHeight,
});

describe("clamp", () => {
  it("applies a lower bound", () => {
    expect(clamp(10, 24)).toBe(24);
    expect(clamp(40, 24)).toBe(40);
  });

  it("applies an optional upper bound", () => {
    expect(clamp(500, 24, 300)).toBe(300);
    expect(clamp(100, 24, 300)).toBe(100);
  });
});

describe("axisSignForDirection", () => {
  it("maps east/west to the x axis", () => {
    expect(axisSignForDirection("e", "x")).toBe(1);
    expect(axisSignForDirection("w", "x")).toBe(-1);
    expect(axisSignForDirection("n", "x")).toBe(0);
  });

  it("maps south/north to the y axis", () => {
    expect(axisSignForDirection("s", "y")).toBe(1);
    expect(axisSignForDirection("n", "y")).toBe(-1);
    expect(axisSignForDirection("e", "y")).toBe(0);
  });
});

describe("resolveResizedDimensions", () => {
  it("grows width on an east drag", () => {
    const result = resolveResizedDimensions(geometry("e"), 50, 0, false, 1000);
    expect(result).toEqual({ width: 250, height: 100 });
  });

  it("grows width on a west drag (delta negated)", () => {
    const result = resolveResizedDimensions(geometry("w"), -50, 0, false, 1000);
    expect(result).toEqual({ width: 250, height: 100 });
  });

  it("clamps to the minimum size", () => {
    const result = resolveResizedDimensions(
      geometry("se"),
      -1000,
      -1000,
      false,
      1000,
    );
    expect(result).toEqual({ width: 24, height: 24 });
  });

  it("clamps width to the maximum", () => {
    const result = resolveResizedDimensions(geometry("e"), 5000, 0, false, 300);
    expect(result.width).toBe(300);
  });

  it("preserves aspect ratio on a corner drag when requested", () => {
    const result = resolveResizedDimensions(geometry("se"), 100, 0, true, 1000);
    expect(result.width).toBe(300);
    expect(result.height).toBeCloseTo(150);
  });
});
