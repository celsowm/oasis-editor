import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  SPECIAL_CHARACTERS,
  insertSpecialCharacter,
} from "@/core/commands/specialChar.js";
import { getParagraphText, getParagraphs } from "@/core/model.js";
import type { EditorState } from "@/core/model.js";

function buildState(text = ""): EditorState {
  const paragraph = createEditorParagraphFromRuns([{ text }]);
  const state = createEditorStateFromDocument(
    createEditorDocument([paragraph]),
  );
  return {
    ...state,
    selection: {
      anchor: { paragraphId: paragraph.id, runId: paragraph.runs[0]!.id, offset: 0 },
      focus: { paragraphId: paragraph.id, runId: paragraph.runs[0]!.id, offset: text.length },
    },
  };
}

describe("special-character insertion (text.nbsp / emDash / …)", () => {
  it("inserts the expected Unicode character for each kind", () => {
    const cases: Array<[string, string]> = [
      ["nbsp", SPECIAL_CHARACTERS.nbsp],
      ["nbHyphen", SPECIAL_CHARACTERS.nbHyphen],
      ["optionalHyphen", SPECIAL_CHARACTERS.optionalHyphen],
      ["emDash", SPECIAL_CHARACTERS.emDash],
      ["ellipsis", SPECIAL_CHARACTERS.ellipsis],
      ["copyright", SPECIAL_CHARACTERS.copyright],
      ["registered", SPECIAL_CHARACTERS.registered],
      ["trademark", SPECIAL_CHARACTERS.trademark],
    ];
    for (const [kind, expected] of cases) {
      const state = buildState("a");
      const next = insertSpecialCharacter(
        state,
        kind as keyof typeof SPECIAL_CHARACTERS,
      );
      const text = getParagraphText(getParagraphs(next)[0]!);
      expect(text.endsWith(expected)).toBe(true);
    }
  });

  it("maps each kind to the exact WordCraft code point", () => {
    expect(SPECIAL_CHARACTERS.nbsp).toBe("\u{00A0}");
    expect(SPECIAL_CHARACTERS.nbHyphen).toBe("\u{2011}");
    expect(SPECIAL_CHARACTERS.optionalHyphen).toBe("\u{00AD}");
    expect(SPECIAL_CHARACTERS.emDash).toBe("\u{2014}");
    expect(SPECIAL_CHARACTERS.ellipsis).toBe("\u{2026}");
    expect(SPECIAL_CHARACTERS.copyright).toBe("\u{00A9}");
    expect(SPECIAL_CHARACTERS.registered).toBe("\u{00AE}");
    expect(SPECIAL_CHARACTERS.trademark).toBe("\u{2122}");
  });
});
