import { describe, it, expect } from "vitest";
import {
  getRunKind,
  isInlineObjectRun,
  visitRun,
  type RunVisitor,
} from "@/core/model.js";
import type { EditorTextRun } from "@/core/model.js";

function run(partial: Partial<EditorTextRun>): EditorTextRun {
  return { id: "r", text: "", ...partial };
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
});
