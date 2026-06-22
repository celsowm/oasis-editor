import { describe, it, expect } from "vitest";
import {
  getRunKind,
  isInlineObjectRun,
  visitRun,
  type RunKind,
  type RunVisitor,
} from "@/core/model.js";
import type { EditorTextRun } from "@/core/model.js";
import { cloneRun } from "@/core/document/clone.js";

function run(partial: Record<string, unknown>): EditorTextRun {
  const kind = partial.footnoteReference
    ? "footnoteReference"
    : partial.endnoteReference
      ? "endnoteReference"
      : partial.fieldChar
        ? "fieldChar"
        : partial.fieldInstruction !== undefined
          ? "fieldInstruction"
          : partial.field
            ? "field"
            : partial.textBox
              ? "textBox"
              : partial.image
                ? "image"
                : partial.sym
                  ? "sym"
                  : "text";
  return { id: "r", text: "", ...partial, kind } as EditorTextRun;
}

describe("getRunKind", () => {
  it("classifies plain text", () => {
    expect(getRunKind(run({ text: "hi" }))).toBe("text");
  });

  it("classifies each object field", () => {
    expect(getRunKind(run({ image: {} as never }))).toBe("image");
    expect(getRunKind(run({ textBox: {} as never }))).toBe("textBox");
    expect(getRunKind(run({ field: {} as never }))).toBe("field");
    expect(getRunKind(run({ fieldChar: {} as never }))).toBe("fieldChar");
    expect(getRunKind(run({ fieldInstruction: "PAGE" }))).toBe(
      "fieldInstruction",
    );
    expect(getRunKind(run({ footnoteReference: {} as never }))).toBe(
      "footnoteReference",
    );
    expect(getRunKind(run({ endnoteReference: {} as never }))).toBe(
      "endnoteReference",
    );
    expect(getRunKind(run({ sym: { font: "Wingdings", char: "F0E0" } }))).toBe(
      "sym",
    );
  });

  it("follows serializer precedence when multiple fields are set", () => {
    // footnoteReference outranks image, which outranks sym/text.
    expect(
      getRunKind(
        run({ footnoteReference: {} as never, image: {} as never, text: "x" }),
      ),
    ).toBe("footnoteReference");
    expect(getRunKind(run({ image: {} as never, sym: { font: "a", char: "1" } }))).toBe(
      "image",
    );
  });
});

describe("isInlineObjectRun", () => {
  it("is true only for image/textBox", () => {
    expect(isInlineObjectRun(run({ image: {} as never }))).toBe(true);
    expect(isInlineObjectRun(run({ textBox: {} as never }))).toBe(true);
    expect(isInlineObjectRun(run({ field: {} as never }))).toBe(false);
    expect(isInlineObjectRun(run({ text: "x" }))).toBe(false);
  });
});

describe("visitRun", () => {
  it("dispatches to the visitor method for the run kind", () => {
    const visitor: RunVisitor<string> = {
      text: () => "text",
      image: () => "image",
      textBox: () => "textBox",
      field: () => "field",
      fieldChar: () => "fieldChar",
      fieldInstruction: () => "fieldInstruction",
      footnoteReference: () => "footnoteReference",
      endnoteReference: () => "endnoteReference",
      sym: () => "sym",
    };
    expect(visitRun(run({ text: "x" }), visitor)).toBe("text");
    expect(visitRun(run({ image: {} as never }), visitor)).toBe("image");
    expect(visitRun(run({ field: {} as never }), visitor)).toBe("field");
  });

  it("narrows the run to its member inside each visitor branch", () => {
    // Compile-time: the object field is accessible without a cast because
    // visitRun narrows to the matching union member (O1).
    const r = run({ image: { width: 5, height: 6 } as never });
    const width = visitRun<number>(r, {
      text: () => 0,
      image: (img) => img.image.width,
      textBox: (tb) => tb.textBox.width,
      field: () => 0,
      fieldChar: () => 0,
      fieldInstruction: () => 0,
      footnoteReference: () => 0,
      endnoteReference: () => 0,
      sym: () => 0,
    });
    expect(width).toBe(5);
  });
});

describe("EditorTextRun discriminated union", () => {
  it("is one member per RunKind value", () => {
    const kinds: RunKind[] = [
      "text",
      "image",
      "textBox",
      "field",
      "fieldChar",
      "fieldInstruction",
      "footnoteReference",
      "endnoteReference",
      "sym",
    ];
    expect(new Set(kinds).size).toBe(9);
  });

  it("rejects invalid field combinations at compile time", () => {
    // A text run cannot carry an image object.
    // @ts-expect-error - `image` does not exist on the "text" member.
    const bad1: EditorTextRun = { id: "r", text: "x", kind: "text", image: {} };
    // An image run cannot also carry a textBox (no longer representable).
    const bad2: EditorTextRun = {
      id: "r",
      text: "￼",
      kind: "image",
      image: {} as never,
      // @ts-expect-error - `textBox` does not exist on the "image" member.
      textBox: {},
    };
    expect(bad1).toBeDefined();
    expect(bad2).toBeDefined();
  });

  it("cloneRun preserves the kind and deep-copies the member field", () => {
    const original = run({ image: { width: 1, height: 2 } as never });
    const cloned = cloneRun(original);
    expect(cloned.kind).toBe("image");
    expect(getRunKind(cloned)).toBe("image");
    if (cloned.kind === "image" && original.kind === "image") {
      expect(cloned.image).not.toBe(original.image);
      expect(cloned.image).toEqual(original.image);
    }
  });
});
