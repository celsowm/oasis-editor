import { describe, expect, it } from "vitest";
import { traceAlphaMaskContour } from "../../../../src/ui/canvas/imageContour.js";

function makeMask(
  width: number,
  height: number,
  inside: (x: number, y: number) => boolean,
): Uint8Array {
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      mask[y * width + x] = inside(x, y) ? 1 : 0;
    }
  }
  return mask;
}

function boundsOf(polygon: Array<{ x: number; y: number }>) {
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

describe("traceAlphaMaskContour", () => {
  it("returns the unit rectangle for a fully opaque mask", () => {
    const mask = makeMask(20, 20, () => true);
    const polygon = traceAlphaMaskContour(mask, 20, 20);
    expect(polygon).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]);
  });

  it("returns the rectangle for an empty mask", () => {
    const mask = makeMask(20, 20, () => false);
    const polygon = traceAlphaMaskContour(mask, 20, 20);
    expect(polygon).toHaveLength(4);
  });

  it("traces a centered disc into a fractional polygon within its bounds", () => {
    const size = 64;
    const r = 24;
    const cx = 32;
    const cy = 32;
    const mask = makeMask(
      size,
      size,
      (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r,
    );
    const polygon = traceAlphaMaskContour(mask, size, size);

    // A circle should simplify to a handful of points but more than a triangle.
    expect(polygon.length).toBeGreaterThanOrEqual(6);
    // All points are fractional and bounded by the disc's extent (with slack).
    for (const point of polygon) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1);
    }
    const bounds = boundsOf(polygon);
    // The disc spans ~[8,56]/64 = [0.125, 0.875]; the contour must not hug 0/1.
    expect(bounds.minX).toBeGreaterThan(0.05);
    expect(bounds.maxX).toBeLessThan(0.95);
    expect(bounds.minY).toBeGreaterThan(0.05);
    expect(bounds.maxY).toBeLessThan(0.95);
  });
});
