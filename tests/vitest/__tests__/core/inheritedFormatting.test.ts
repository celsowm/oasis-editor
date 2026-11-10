import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getParagraphs,
  paragraphOffsetToPosition,
  resolveEffectiveTextStyleForParagraph,
  getParagraphText,
} from "@/core/model.js";
import type { EditorState, EditorTextStyle } from "@/core/model.js";
import {
  toggleTextStyle,
  applyUnderlineStyle,
} from "@/core/commands/textFormatting.js";
function fixture() {
  const p = createEditorParagraphFromRuns([
    { text: "before " },
    {
      text: "inherited",
      styles: {
        styleId: "StrongEmphasis",
        link: "https://example.com/destination",
      },
    },
    { text: " after" },
  ]);
  p.style = { styleId: "Note" };
  const state = createEditorStateFromDocument(createEditorDocument([p]));
  state.document.styles = {
    ...state.document.styles,
    Note: {
      id: "Note",
      name: "Note",
      type: "paragraph",
      textStyle: { bold: true, underline: true, underlineStyle: "double" },
    },
    StrongEmphasis: {
      id: "StrongEmphasis",
      name: "Strong emphasis",
      type: "character",
      textStyle: { italic: true },
    },
  };
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(p, 7),
      focus: paragraphOffsetToPosition(p, 16),
    },
  };
}
function target(state: EditorState) {
  const p = getParagraphs(state)[0]!;
  const r = p.runs.find((r) => r.text === "inherited")!;
  return {
    p,
    r,
    effective: resolveEffectiveTextStyleForParagraph(
      r.styles,
      p.style?.styleId,
      state.document.styles,
    ),
  };
}
describe("formatting overrides inherited appearance", () => {
  it.each(["bold", "italic", "underline"] as const)(
    "turns off inherited %s on the first toggle",
    (key) => {
      const initial = fixture();
      const before = JSON.stringify(initial);
      const next = toggleTextStyle(initial, key);
      expect(target(next).effective[key]).toBe(false);
      expect(target(next).r.styles?.[key]).toBe(false);
      expect(target(next).r.styles?.link).toBe(
        "https://example.com/destination",
      );
      expect(getParagraphText(target(next).p)).toBe("before inherited after");
      expect(JSON.stringify(initial)).toBe(before);
      expect(target(toggleTextStyle(next, key)).effective[key]).toBe(true);
    },
  );
  it("sets a mixed selection uniformly before toggling it off", () => {
    const initial = fixture();
    const p = getParagraphs(initial)[0]!;
    p.runs[0]!.styles = { bold: false };
    const mixed = {
      ...initial,
      selection: {
        anchor: paragraphOffsetToPosition(p, 0),
        focus: paragraphOffsetToPosition(p, 16),
      },
    };
    const allOn = toggleTextStyle(mixed, "bold");
    expect(
      getParagraphs(allOn)[0]!
        .runs.filter((r) => r.text !== " after")
        .every((r) => r.styles?.bold === true),
    ).toBe(true);
    const allOff = toggleTextStyle(allOn, "bold");
    expect(
      getParagraphs(allOff)[0]!
        .runs.filter((r) => r.text !== " after")
        .every((r) => r.styles?.bold === false),
    ).toBe(true);
    expect(target(allOff).effective.bold).toBe(false);
  });
  it("single and removal override an inherited double underline", () => {
    const initial = fixture();
    const single = target(applyUnderlineStyle(initial, "single"));
    expect(single.effective.underline).toBe(true);
    expect(single.effective.underlineStyle).toBe("single");
    const off = target(applyUnderlineStyle(initial, null));
    expect(off.effective.underline).toBe(false);
    expect(off.effective.underlineStyle).toBeNull();
    expect(off.r.styles?.bold).toBeUndefined();
    expect(off.effective.bold).toBe(true);
  });
  it.each(["superscript", "subscript"] as const)(
    "enabling %s disables the opposite inherited position",
    (key) => {
      const initial = fixture();
      const opposite = key === "superscript" ? "subscript" : "superscript";
      initial.document.styles!.Note!.textStyle = { [opposite]: true };
      const enabled = target(toggleTextStyle(initial, key));
      expect(enabled.effective[key]).toBe(true);
      expect(enabled.effective[opposite]).toBe(false);
    },
  );
  it("ordinary direct formatting retains its minimal removal representation", () => {
    const p = createEditorParagraphFromRuns([
      { text: "plain", styles: { bold: true } as EditorTextStyle },
    ]);
    const state = createEditorStateFromDocument(createEditorDocument([p]));
    state.selection = {
      anchor: paragraphOffsetToPosition(p, 0),
      focus: paragraphOffsetToPosition(p, 5),
    };
    expect(
      getParagraphs(toggleTextStyle(state, "bold"))[0]!.runs[0]!.styles?.bold,
    ).toBeUndefined();
  });
});
