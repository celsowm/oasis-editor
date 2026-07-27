import { describe, expect, it } from "vitest";
import { createEditorStateFromTexts } from "@/core/editorState.js";
import type { EditorState } from "@/core/model.js";
import {
  MAX_EDITOR_HISTORY_ENTRIES,
  appendEditorHistoryEntry,
  applyEditorHistoryTransaction,
  createEmptyEditorHistoryState,
} from "@/ui/editorHistory.js";

describe("editor history", () => {
  it("retains only the newest history entries", () => {
    let stack: EditorState[] = [];
    const states = Array.from(
      { length: MAX_EDITOR_HISTORY_ENTRIES + 5 },
      (_, index) => createEditorStateFromTexts([String(index)]),
    );

    for (const state of states) {
      stack = appendEditorHistoryEntry(stack, state);
    }

    expect(stack).toHaveLength(MAX_EDITOR_HISTORY_ENTRIES);
    expect(stack[0]).toBe(states[5]);
    expect(stack.at(-1)).toBe(states.at(-1));
  });

  it("applies the same bound to normal transactions", () => {
    let history = createEmptyEditorHistoryState();
    const states = Array.from(
      { length: MAX_EDITOR_HISTORY_ENTRIES + 2 },
      (_, index) => createEditorStateFromTexts([String(index)]),
    );

    for (let index = 1; index < states.length; index += 1) {
      history = applyEditorHistoryTransaction(
        history,
        states[index - 1]!,
        states[index]!,
      );
    }

    expect(history.undoStack).toHaveLength(MAX_EDITOR_HISTORY_ENTRIES);
    expect(history.undoStack[0]).toBe(states[1]);
    expect(history.undoStack.at(-1)).toBe(states.at(-2));
  });
});
