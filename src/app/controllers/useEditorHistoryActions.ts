import { MERGE_KEYS, type MergeKey } from "@/core/transactionMergeKeys.js";
import {
  takeEditorUndoStep,
  takeEditorRedoStep,
  type EditorHistoryState,
} from "@/ui/editorHistory.js";
import type { EditorState } from "@/core/model.js";
import {
  getActiveSectionIndex,
  getActiveZone,
  getDocumentSectionsCanonical,
  getParagraphs,
  getParagraphLength,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { createEditorParagraph } from "@/core/editorState.js";
import { moveSelectedImageToPosition } from "@/core/commands/image.js";
import { cloneSection } from "@/core/cloneState.js";
import type { createEditorImageOperations } from "./useEditorImageOperations.js";

export interface UseEditorHistoryActionsProps {
  state: () => EditorState;
  stateSnapshot: () => EditorState;
  applyHistoryState: (state: EditorState) => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: MergeKey },
  ) => void;
  focusInput: () => void;
  clearPreferredColumn: () => void;
  imageOps: () => ReturnType<typeof createEditorImageOperations>;
  updateHistoryState: (
    updater: (current: EditorHistoryState) => EditorHistoryState,
  ) => void;
  getHistoryState: () => EditorHistoryState;
}

export function createEditorHistoryActions(
  deps: UseEditorHistoryActionsProps,
): ReturnType<typeof createEditorHistoryActionsImpl> {
  return createEditorHistoryActionsImpl(deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createEditorHistoryActionsImpl(deps: UseEditorHistoryActionsProps) {
  const insertParagraphAtZoneBoundary = (
    currentState: EditorState,
    direction: -1 | 1,
  ): EditorState => {
    const sections = getDocumentSectionsCanonical(currentState.document);
    const sectionIndex = Math.max(
      0,
      Math.min(getActiveSectionIndex(currentState), sections.length - 1),
    );
    const zone = getActiveZone(currentState);
    const targetSection = sections[sectionIndex];
    if (!targetSection) {
      return currentState;
    }

    const nextSections = [...sections];
    const nextSection = { ...targetSection };
    const insertedParagraph = createEditorParagraph("");

    if (zone === "header") {
      const header = [...(targetSection.header ?? [])];
      if (direction < 0) {
        header.unshift(insertedParagraph);
      } else {
        header.push(insertedParagraph);
      }
      nextSection.header = header;
    } else if (zone === "footer") {
      const footer = [...(targetSection.footer ?? [])];
      if (direction < 0) {
        footer.unshift(insertedParagraph);
      } else {
        footer.push(insertedParagraph);
      }
      nextSection.footer = footer;
    } else {
      const blocks = [...targetSection.blocks];
      if (direction < 0) {
        blocks.unshift(insertedParagraph);
      } else {
        blocks.push(insertedParagraph);
      }
      nextSection.blocks = blocks;
    }

    nextSections[sectionIndex] = nextSection;
    return {
      ...currentState,
      document: {
        ...currentState.document,
        sections: nextSections,
      },
    };
  };

  const performUndo = (): void => {
    const step = takeEditorUndoStep(
      deps.getHistoryState(),
      deps.stateSnapshot(),
    );
    if (!step) {
      return;
    }

    deps.updateHistoryState((): EditorHistoryState => step.history);
    deps.clearPreferredColumn();
    deps.applyHistoryState(step.nextState);
    deps.focusInput();
  };

  const performRedo = (): void => {
    const step = takeEditorRedoStep(
      deps.getHistoryState(),
      deps.stateSnapshot(),
    );
    if (!step) {
      return;
    }

    deps.updateHistoryState((): EditorHistoryState => step.history);
    deps.clearPreferredColumn();
    deps.applyHistoryState(step.nextState);
    deps.focusInput();
  };

  const moveSelectedImageByParagraph = (direction: -1 | 1): boolean => {
    const selectedImage = deps.imageOps().getSelectedImageInfo(deps.state());
    if (!selectedImage) {
      return false;
    }

    const paragraphs = getParagraphs(deps.state());
    const sourceIndex = paragraphs.findIndex(
      (paragraph): boolean => paragraph.id === selectedImage.paragraph.id,
    );
    if (sourceIndex < 0) {
      return false;
    }

    const targetIndex = sourceIndex + direction;
    if (targetIndex < 0 || targetIndex >= paragraphs.length) {
      const currentState = deps.state();
      const nextState = insertParagraphAtZoneBoundary(currentState, direction);
      const nextParagraphs = getParagraphs(nextState);
      const insertedParagraph =
        direction < 0
          ? nextParagraphs[0]
          : nextParagraphs[nextParagraphs.length - 1];
      if (!insertedParagraph) {
        return false;
      }
      const targetPosition = paragraphOffsetToPosition(
        insertedParagraph,
        direction < 0 ? getParagraphLength(insertedParagraph) : 0,
      );
      deps.applyTransactionalState(
        (): EditorState =>
          moveSelectedImageToPosition(nextState, targetPosition),
        {
          mergeKey: MERGE_KEYS.moveImage,
        },
      );
      deps.focusInput();
      return true;
    }

    const targetParagraph = paragraphs[targetIndex];
    const targetOffset =
      direction < 0 ? getParagraphLength(targetParagraph) : 0;

    deps.applyTransactionalState(
      (current): EditorState =>
        moveSelectedImageToPosition(
          current,
          paragraphOffsetToPosition(targetParagraph, targetOffset),
        ),
      { mergeKey: MERGE_KEYS.moveImage },
    );
    deps.focusInput();
    return true;
  };

  const applySelectionPreservingStructure = (
    nextSelection: EditorState["selection"],
  ): void => {
    const snapshot = deps.stateSnapshot();
    deps.applyHistoryState({
      ...snapshot,
      document: {
        ...snapshot.document,
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
