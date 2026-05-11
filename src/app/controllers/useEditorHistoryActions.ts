import {
  takeEditorUndoStep,
  takeEditorRedoStep,
  resetEditorHistoryGrouping,
  type EditorHistoryState,
} from "../../ui/editorHistory.js";
import type { EditorState, EditorPosition } from "../../core/model.js";
import { 
  getParagraphs, 
  getParagraphLength, 
  paragraphOffsetToPosition,
} from "../../core/model.js";
import { 
  createEditorParagraph 
} from "../../core/editorState.js";
import { 
  moveSelectedImageToPosition 
} from "../../core/editorCommands.js";
import {
  cloneBlock,
  cloneSection,
  cloneEditorState,
} from "../../core/cloneState.js";
import type { createEditorImageOperations } from "./useEditorImageOperations.js";

export interface UseEditorHistoryActionsProps {
  state: () => EditorState;
  stateSnapshot: () => EditorState;
  applyHistoryState: (state: EditorState) => void;
  applyTransactionalState: (producer: (current: EditorState) => EditorState, options?: any) => void;
  focusInput: () => void;
  clearPreferredColumn: () => void;
  imageOps: () => ReturnType<typeof createEditorImageOperations>;
  updateHistoryState: (updater: (current: EditorHistoryState) => EditorHistoryState) => void;
  getHistoryState: () => EditorHistoryState;
}

export function createEditorHistoryActions(deps: UseEditorHistoryActionsProps) {
  const performUndo = () => {
    const step = takeEditorUndoStep(deps.getHistoryState(), deps.stateSnapshot());
    if (!step) {
      return;
    }

    deps.updateHistoryState(() => step.history);
    deps.clearPreferredColumn();
    deps.applyHistoryState(step.nextState);
    deps.focusInput();
  };

  const performRedo = () => {
    const step = takeEditorRedoStep(deps.getHistoryState(), deps.stateSnapshot());
    if (!step) {
      return;
    }

    deps.updateHistoryState(() => step.history);
    deps.clearPreferredColumn();
    deps.applyHistoryState(step.nextState);
    deps.focusInput();
  };

  const moveSelectedImageByParagraph = (direction: -1 | 1) => {
    const selectedImage = deps.imageOps().getSelectedImageInfo(deps.state());
    if (!selectedImage) {
      return false;
    }

    const paragraphs = getParagraphs(deps.state());
    const sourceIndex = paragraphs.findIndex(
      (paragraph) => paragraph.id === selectedImage.paragraph.id,
    );
    if (sourceIndex < 0) {
      return false;
    }

    const targetIndex = sourceIndex + direction;
    if (targetIndex < 0 || targetIndex >= paragraphs.length) {
      const insertedParagraph = createEditorParagraph("");
      const currentState = deps.state();
      const nextState: EditorState = {
        document: {
          ...currentState.document,
          blocks:
            direction < 0
              ? [insertedParagraph, ...currentState.document.blocks]
              : [...currentState.document.blocks, insertedParagraph],
        },
        selection: {
          anchor: { ...currentState.selection.anchor },
          focus: { ...currentState.selection.focus },
        },
      };
      const targetPosition = paragraphOffsetToPosition(
        insertedParagraph,
        direction < 0 ? getParagraphLength(insertedParagraph) : 0,
      );
      deps.applyTransactionalState(
        () => moveSelectedImageToPosition(nextState, targetPosition),
        {
          mergeKey: "moveImage",
        },
      );
      deps.focusInput();
      return true;
    }

    const targetParagraph = paragraphs[targetIndex];
    const targetOffset =
      direction < 0 ? getParagraphLength(targetParagraph) : 0;

    deps.applyTransactionalState(
      (current) =>
        moveSelectedImageToPosition(
          current,
          paragraphOffsetToPosition(targetParagraph, targetOffset),
        ),
      { mergeKey: "moveImage" },
    );
    deps.focusInput();
    return true;
  };

  const applySelectionPreservingStructure = (
    nextSelection: EditorState["selection"],
  ) => {
    const snapshot = deps.stateSnapshot();
    deps.applyHistoryState({
      ...snapshot,
      document: {
        ...snapshot.document,
        blocks: snapshot.document.blocks.map(cloneBlock),
        sections: snapshot.document.sections?.map(cloneSection),
      },
      selection: {
        anchor: { ...nextSelection.anchor },
        focus: { ...nextSelection.focus },
      },
    });
  };

  return {
    performUndo,
    performRedo,
    moveSelectedImageByParagraph,
    applySelectionPreservingStructure,
  };
}
