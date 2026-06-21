import { describe, it, expect } from "vitest";
import { assertNever } from "@/core/assertNever.js";

describe("assertNever", () => {
  it("throws with the discriminant tag for tagged objects", () => {
    const rogue = { type: "image" } as never;
    expect(() => assertNever(rogue, "block")).toThrow("Unhandled block: image");
  });

  it("throws with the raw value for primitives", () => {
    expect(() => assertNever("x" as never)).toThrow("Unhandled value: x");
  });
});
