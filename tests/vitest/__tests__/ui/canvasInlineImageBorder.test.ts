import { describe, expect, it } from "vitest";
import { drawImageFragment } from "@/ui/canvas/paragraph/canvasInlineImage.js";
import { PX_PER_POINT } from "@/core/units.js";
import type { EditorImageRunData } from "@/core/model.js";

type Call = [string, ...unknown[]];

/**
 * A canvas 2D context that records the operations we care about. Enough to
 * assert what the painter emits without a real canvas.
 */
function createRecordingContext(): {
  ctx: CanvasRenderingContext2D;
  calls: Call[];
} {
  const calls: Call[] = [];
  const record =
    (name: string) =>
    (...args: unknown[]): void => {
      calls.push([name, ...args]);
    };
  const ctx = {
    save: record("save"),
    restore: record("restore"),
    translate: record("translate"),
    rotate: record("rotate"),
    scale: record("scale"),
    drawImage: record("drawImage"),
    fillRect: record("fillRect"),
    strokeRect: record("strokeRect"),
    setLineDash: record("setLineDash"),
    createPattern: (): CanvasPattern => ({}) as CanvasPattern,
    set strokeStyle(value: string) {
      calls.push(["strokeStyle", value]);
    },
    set lineWidth(value: number) {
      calls.push(["lineWidth", value]);
    },
    set fillStyle(_value: unknown) {},
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const img = {
  naturalWidth: 400,
  naturalHeight: 200,
} as CanvasImageSource & { naturalWidth: number; naturalHeight: number };

function paint(image: EditorImageRunData): Call[] {
  const { ctx, calls } = createRecordingContext();
  drawImageFragment(ctx, img, image, 10, 20);
  return calls;
}

const baseImage: EditorImageRunData = {
  src: "asset:1",
  width: 200,
  height: 100,
};

/** Everything the border pass emitted, i.e. after the final content draw. */
function borderCalls(calls: Call[]): Call[] {
  const lastContent = calls.map((c) => c[0]).lastIndexOf("drawImage");
  const lastFill = calls.map((c) => c[0]).lastIndexOf("fillRect");
  return calls.slice(Math.max(lastContent, lastFill) + 1);
}

describe("canvas picture border", () => {
  it("draws nothing extra when the image has no border", () => {
    const calls = paint(baseImage);
    expect(calls.some((c) => c[0] === "strokeRect")).toBe(false);
  });

  it("strokes the displayed box once, centred on the origin", () => {
    const calls = paint({ ...baseImage, border: { color: "#C00000" } });
    const strokes = calls.filter((c) => c[0] === "strokeRect");
    expect(strokes).toEqual([["strokeRect", -100, -50, 200, 100]]);
    expect(calls).toContainEqual(["translate", 110, 70]);
    expect(calls).toContainEqual(["strokeStyle", "#C00000"]);
  });

  it("converts the weight from points to pixels, with a 1px floor", () => {
    const thick = paint({
      ...baseImage,
      border: { color: "#000000", widthPt: 3 },
    });
    expect(thick).toContainEqual(["lineWidth", 3 * PX_PER_POINT]);

    const hairline = paint({
      ...baseImage,
      border: { color: "#000000", widthPt: 0.25 },
    });
    expect(hairline).toContainEqual(["lineWidth", 1]);
  });

  it("scales the shared dash pattern into pixels", () => {
    const calls = paint({
      ...baseImage,
      border: { color: "#000000", dash: "dash" },
    });
    expect(calls).toContainEqual([
      "setLineDash",
      [3.75 * PX_PER_POINT, 2.25 * PX_PER_POINT],
    ]);
  });

  it("passes an empty dash array for a solid border", () => {
    const calls = paint({ ...baseImage, border: { color: "#000000" } });
    expect(calls).toContainEqual(["setLineDash", []]);
  });

  it("rotates the border with the image but never mirrors it", () => {
    const calls = paint({
      ...baseImage,
      rotation: 30,
      flipH: true,
      border: { color: "#000000" },
    });
    const border = borderCalls(calls);
    expect(border).toContainEqual(["rotate", (30 * Math.PI) / 180]);
    // A rectangle is flip-symmetric; scaling by -1 would only reverse the dash
    // phase, so the border pass must not apply the flip.
    expect(border.some((c) => c[0] === "scale")).toBe(false);
  });

  it("strokes the displayed box, not the source rect, when cropped", () => {
    const calls = paint({
      ...baseImage,
      crop: { left: 0.25, right: 0.25 },
      border: { color: "#000000" },
    });
    expect(calls).toContainEqual(["strokeRect", -100, -50, 200, 100]);
  });

  it("strokes a tiled image too", () => {
    const calls = paint({
      ...baseImage,
      fillMode: "tile",
      border: { color: "#000000" },
    });
    expect(calls).toContainEqual(["strokeRect", -100, -50, 200, 100]);
  });
});
