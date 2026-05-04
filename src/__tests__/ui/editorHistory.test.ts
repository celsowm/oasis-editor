import { describe, expect, it } from "vitest";
import {
  applyEditorHistoryTransaction,
  createEmptyEditorHistoryState,
  takeEditorRedoStep,
  takeEditorUndoStep,
} from "../../ui/editorHistory.js";
import { createEditorStateFromTexts, resetEditorIds } from "../../core/editorState.js";

describe("editorHistory", () => {
  it("merges consecutive transactions with the same merge key", () => {
    resetEditorIds();
    const previous = createEditorStateFromTexts(["a"], { blockIndex: 0, offset: 1 });
    const nextA = createEditorStateFromTexts(["ab"], { blockIndex: 0, offset: 2 });
    const nextB = createEditorStateFromTexts(["abc"], { blockIndex: 0, offset: 3 });

    const initial = createEmptyEditorHistoryState();
    const once = applyEditorHistoryTransaction(initial, previous, nextA, { mergeKey: "typing" }, 1000);
    const twice = applyEditorHistoryTransaction(once, nextA, nextB, { mergeKey: "typing" }, 1500);

    expect(once.undoStack).toHaveLength(1);
    expect(twice.undoStack).toHaveLength(1);
    expect(twice.redoStack).toHaveLength(0);
  });

  it("creates independent undo entries when the merge key changes", () => {
    resetEditorIds();
    const previous = createEditorStateFromTexts(["a"], { blockIndex: 0, offset: 1 });
    const nextA = createEditorStateFromTexts(["ab"], { blockIndex: 0, offset: 2 });
    const nextB = createEditorStateFromTexts(["ab"], { blockIndex: 0, offset: 1 });

    const initial = createEmptyEditorHistoryState();
    const once = applyEditorHistoryTransaction(initial, previous, nextA, { mergeKey: "typing" }, 1000);
    const twice = applyEditorHistoryTransaction(once, nextA, nextB, { mergeKey: "moveImage" }, 1100);

    expect(twice.undoStack).toHaveLength(2);
  });

  it("supports undo and redo snapshots", () => {
    resetEditorIds();
    const initialState = createEditorStateFromTexts(["a"], { blockIndex: 0, offset: 1 });
    const nextState = createEditorStateFromTexts(["ab"], { blockIndex: 0, offset: 2 });

    const history = applyEditorHistoryTransaction(
      createEmptyEditorHistoryState(),
      initialState,
      nextState,
      { mergeKey: "typing" },
      1000,
    );

    const undo = takeEditorUndoStep(history, nextState);
    expect(undo?.nextState.document.blocks[0]).toEqual(initialState.document.blocks[0]);
    expect(undo?.history.redoStack).toHaveLength(1);

    const redo = undo ? takeEditorRedoStep(undo.history, undo.nextState) : null;
    expect(redo?.nextState.document.blocks[0]).toEqual(nextState.document.blocks[0]);
    expect(redo?.history.undoStack).toHaveLength(1);
  });
});
