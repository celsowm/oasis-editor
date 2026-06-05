import { describe, it, expect, beforeEach } from "vitest";
import {
  createInitialEditorState,
  resetEditorIds,
} from "../../core/editorState.js";
import {
  insertTextAtSelection,
  deleteBackward,
} from "../../core/commands/text.js";
import { getParagraphs } from "../../core/model.js";

beforeEach(() => {
  resetEditorIds();
});

describe("document flow integration", () => {
  it("performs a sequence of edits correctly", () => {
    let state = createInitialEditorState();

    // Insert "Hello"
    state = insertTextAtSelection(state, "Hello");
    expect(getParagraphs(state)[0].runs[0].text).toBe("Hello");

    // Insert " world"
    state = insertTextAtSelection(state, " world");
    expect(getParagraphs(state)[0].runs[0].text).toBe("Hello world");

    // Move back and delete " world" (this is simplified, we'll just delete from end)
    for (let i = 0; i < 6; i++) {
      state = deleteBackward(state);
    }
    expect(getParagraphs(state)[0].runs[0].text).toBe("Hello");

    // Final check
    const paragraphs = getParagraphs(state);
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].runs[0].text).toBe("Hello");
  });
});
