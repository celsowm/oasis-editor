import { describe, expect, it } from "vitest";
import {
  applyEditor2HistoryTransaction,
  createEmptyEditor2HistoryState,
  takeEditor2RedoStep,
  takeEditor2UndoStep,
} from "../../ui/editor2History.js";
import { createEditor2StateFromTexts, resetEditor2Ids } from "../../core/editorState.js";

describe("editor2History", () => {
  it("merges consecutive transactions with the same merge key", () => {
    resetEditor2Ids();
    const previous = createEditor2StateFromTexts(["a"], { blockIndex: 0, offset: 1 });
    const nextA = createEditor2StateFromTexts(["ab"], { blockIndex: 0, offset: 2 });
    const nextB = createEditor2StateFromTexts(["abc"], { blockIndex: 0, offset: 3 });

    const initial = createEmptyEditor2HistoryState();
    const once = applyEditor2HistoryTransaction(initial, previous, nextA, { mergeKey: "typing" }, 1000);
    const twice = applyEditor2HistoryTransaction(once, nextA, nextB, { mergeKey: "typing" }, 1500);

    expect(once.undoStack).toHaveLength(1);
    expect(twice.undoStack).toHaveLength(1);
    expect(twice.redoStack).toHaveLength(0);
  });

  it("creates independent undo entries when the merge key changes", () => {
    resetEditor2Ids();
    const previous = createEditor2StateFromTexts(["a"], { blockIndex: 0, offset: 1 });
    const nextA = createEditor2StateFromTexts(["ab"], { blockIndex: 0, offset: 2 });
    const nextB = createEditor2StateFromTexts(["ab"], { blockIndex: 0, offset: 1 });

    const initial = createEmptyEditor2HistoryState();
    const once = applyEditor2HistoryTransaction(initial, previous, nextA, { mergeKey: "typing" }, 1000);
    const twice = applyEditor2HistoryTransaction(once, nextA, nextB, { mergeKey: "moveImage" }, 1100);

    expect(twice.undoStack).toHaveLength(2);
  });

  it("supports undo and redo snapshots", () => {
    resetEditor2Ids();
    const initialState = createEditor2StateFromTexts(["a"], { blockIndex: 0, offset: 1 });
    const nextState = createEditor2StateFromTexts(["ab"], { blockIndex: 0, offset: 2 });

    const history = applyEditor2HistoryTransaction(
      createEmptyEditor2HistoryState(),
      initialState,
      nextState,
      { mergeKey: "typing" },
      1000,
    );

    const undo = takeEditor2UndoStep(history, nextState);
    expect(undo?.nextState.document.blocks[0]).toEqual(initialState.document.blocks[0]);
    expect(undo?.history.redoStack).toHaveLength(1);

    const redo = undo ? takeEditor2RedoStep(undo.history, undo.nextState) : null;
    expect(redo?.nextState.document.blocks[0]).toEqual(nextState.document.blocks[0]);
    expect(redo?.history.undoStack).toHaveLength(1);
  });
});
