import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  findMatchesInDocument,
  replaceAllInDocument,
} from "@/core/commands/findReplace.js";
import {
  getParagraphText,
  getParagraphs,
  type EditorState,
} from "@/core/model.js";

function buildState(lines: string[]): EditorState {
  const blocks = lines.map((text) =>
    createEditorParagraphFromRuns([{ text }]),
  );
  return createEditorStateFromDocument(createEditorDocument(blocks));
}

function textOf(state: EditorState): string[] {
  return getParagraphs(state).map(getParagraphText);
}

describe("find & replace-all (edit.find / edit.replaceAll)", () => {
  it("finds all literal matches case-insensitively by default", () => {
    const matches = findMatchesInDocument(
      buildState(["The cat and the dog", "in the"]).document,
      "the",
    );
    // "The" (index 0) + "the" (after "and") in the first paragraph,
    // plus "the" in the second paragraph.
    expect(matches).toHaveLength(3);
  });

  it("honours matchCase", () => {
    const matches = findMatchesInDocument(
      buildState(["The cat and the dog"]).document,
      "the",
      { matchCase: true },
    );
    // Only the lower-case "the" after "and" matches with matchCase on.
    expect(matches).toHaveLength(1);
  });

  it("honours wholeWord", () => {
    const doc = buildState(["cat catalog scatter"]).document;
    expect(findMatchesInDocument(doc, "cat", { wholeWord: true })).toHaveLength(
      1,
    );
    expect(findMatchesInDocument(doc, "cat")).toHaveLength(3);
  });

  it("escapes regex metacharacters so the term is matched literally", () => {
    const matches = findMatchesInDocument(
      buildState(["a+b (c) [d] {e}"]).document,
      "(c)",
    );
    expect(matches).toHaveLength(1);
  });

  it("returns no matches for an empty search term", () => {
    expect(findMatchesInDocument(buildState(["hi"]).document, "")).toEqual([]);
  });

  it("replaces every occurrence across the document", () => {
    const state = buildState(["The cat and the dog", "in the box"]);
    const next = replaceAllInDocument(state, "the", "a");
    expect(textOf(next)).toEqual(["a cat and a dog", "in a box"]);
  });

  it("is case-insensitive unless matchCase is set", () => {
    const state = buildState(["The THE the"]);
    expect(textOf(replaceAllInDocument(state, "the", "X"))).toEqual([
      "X X X",
    ]);
    expect(
      textOf(replaceAllInDocument(state, "the", "X", { matchCase: true })),
    ).toEqual(["The THE X"]);
  });

  it("is a no-op when there is nothing to replace", () => {
    const state = buildState(["hello world"]);
    expect(replaceAllInDocument(state, "zzz", "x")).toBe(state);
  });

  it("is a no-op for an empty search term", () => {
    const state = buildState(["hello world"]);
    expect(replaceAllInDocument(state, "", "x")).toBe(state);
  });
});
