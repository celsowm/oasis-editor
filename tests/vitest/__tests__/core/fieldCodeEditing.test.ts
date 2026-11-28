import { describe, expect, it } from "vitest";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { getParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import type { EditorParagraphNode, EditorTextRun, EditorState } from "@/core/model.js";
import {
  editFieldCode, fieldCodeDisplayText, findFieldInstructionAtSelection,
  insertFieldCode, navigateFields, setShowFieldCodes, toggleFieldLock,
} from "@/core/commands/fieldCode.js";

const run = (id: string, text: string): EditorTextRun => ({ id, kind: "text", text });
const marker = (id: string, kind: "begin" | "separate" | "end", fieldLock?: boolean): EditorTextRun =>
  ({ id, kind: "fieldChar", text: "", fieldChar: { kind, fieldLock } });
const instr = (id: string, text: string): EditorTextRun =>
  ({ id, kind: "fieldInstruction", text: "", fieldInstruction: text });

function withField(): EditorState {
  const paragraph: EditorParagraphNode = {
    ...createEditorParagraph("Alpha"),
    runs: [run("a", "Alpha"), marker("b", "begin"), instr("i", " PAGE "), marker("s", "separate"), run("r", "1"), marker("e", "end"), run("z", "!")],
  };
  const state = createEditorStateFromDocument(createEditorDocument([paragraph]));
  const pos = paragraphOffsetToPosition(paragraph, 5);
  return { ...state, selection: { anchor: pos, focus: pos } };
}

describe("generic field code editing", () => {
  it("inserts a lexically valid code as a dirty complex field", () => {
    const base = createEditorStateFromDocument(createEditorDocument([createEditorParagraph("")]));
    const inserted = insertFieldCode(base, " PAGE \\* roman ");
    expect(inserted).not.toBe(base);
    const paragraph = getParagraphs(inserted)[0]!;
    expect(paragraph.runs.map(r => r.kind)).toEqual(["fieldChar", "fieldInstruction", "fieldChar", "text", "fieldChar"]);
    expect(paragraph.runs[0]).toMatchObject({ fieldChar: { kind: "begin", dirty: true } });
    expect(paragraph.runs[1]).toMatchObject({ fieldInstruction: " PAGE \\* roman " });
    expect(fieldCodeDisplayText(getParagraphs(inserted))).toBe("{  PAGE \\* roman   }");
    expect(insertFieldCode(base, " PAGE \\ bad ")).toBe(base);
  });

  it("edits only the instruction, preserves the cached result and marks dirty", () => {
    const state = withField();
    const next = editFieldCode(state, "i", " NUMPAGES ");
    expect(next).not.toBe(state);
    const paragraph = getParagraphs(next)[0]!;
    expect(paragraph.runs.find(r => r.id === "i")).toMatchObject({ fieldInstruction: " NUMPAGES " });
    expect(paragraph.runs.find(r => r.id === "r")).toMatchObject({ text: "1" });
    expect(paragraph.runs.find(r => r.id === "b")).toMatchObject({ fieldChar: { kind: "begin", dirty: true } });
    expect(state.selection).toBe(next.selection);
    expect(editFieldCode(state, "i", " PAGE \\ bad ")).toBe(state);
    expect(editFieldCode(state, "a", " PAGE ")).toBe(state);
  });

  it("refuses to edit a locked field and toggles its lock", () => {
    const state = withField();
    const locked = toggleFieldLock(state, "b");
    expect(getParagraphs(locked)[0]!.runs.find(r => r.id === "b")).toMatchObject({ fieldChar: { fieldLock: true } });
    expect(editFieldCode(locked, "i", " NUMPAGES ")).toBe(locked);
    expect(toggleFieldLock(locked, "b")).not.toBe(locked);
    expect(getParagraphs(toggleFieldLock(locked, "b"))[0]!.runs.find(r => r.id === "b")).toMatchObject({ fieldChar: { fieldLock: undefined } });
  });

  it("navigates fields and toggles display without mutating the document", () => {
    const state = withField();
    // A single field has nowhere to navigate to.
    expect(navigateFields(state, "next")).toBe(state);
    const two: EditorParagraphNode = {
      ...createEditorParagraph("X"),
      runs: [marker("b1", "begin"), instr("i1", " PAGE "), marker("s1", "separate"), run("r1", "1"), marker("e1", "end"),
        marker("b2", "begin"), instr("i2", " NUMPAGES "), marker("s2", "separate"), run("r2", "2"), marker("e2", "end")],
    };
    const twoState = createEditorStateFromDocument(createEditorDocument([two]));
    const next = navigateFields(twoState, "next");
    expect(next).not.toBe(twoState);
    expect(JSON.stringify(next.document)).toBe(JSON.stringify(twoState.document));
    const shown = setShowFieldCodes(state, true);
    expect(shown.showFieldCodes).toBe(true);
    expect(setShowFieldCodes(shown, true)).toBe(shown);
  });

  it("locates the field instruction under the caret for selection-only editing", () => {
    const state = withField();
    const outside = paragraphOffsetToPosition(getParagraphs(state)[0]!, 0);
    expect(findFieldInstructionAtSelection({ ...state, selection: { anchor: outside, focus: outside } })).toBeUndefined();
    const pos = paragraphOffsetToPosition(getParagraphs(state)[0]!, 5);
    const inside = { ...state, selection: { anchor: pos, focus: pos } };
    expect(findFieldInstructionAtSelection(inside)).toBe("i");
    const next = editFieldCode(inside, findFieldInstructionAtSelection(inside)!, " NUMPAGES ");
    expect(getParagraphs(next)[0]!.runs.find(r => r.id === "i")).toMatchObject({ fieldInstruction: " NUMPAGES " });
  });

  it("fails closed on malformed or nested stories", () => {
    const paragraph: EditorParagraphNode = {
      ...createEditorParagraph("X"),
      runs: [marker("b", "begin"), instr("i", " PAGE "), marker("s", "separate"), run("r", "1"), marker("e", "end")],
    };
    const state = createEditorStateFromDocument(createEditorDocument([paragraph]));
    expect(navigateFields(state, "next")).toBe(state);
    const broken: EditorParagraphNode = { ...paragraph, runs: [marker("orphan", "end"), ...paragraph.runs] };
    const brokenState = createEditorStateFromDocument(createEditorDocument([broken]));
    expect(editFieldCode(brokenState, "i", " NUMPAGES ")).toBe(brokenState);
  });
});
