import { registerHandler } from "../OperationHandlers.js";
import { OperationType, AcceptRevisionOp, RejectRevisionOp } from "../../operations/OperationTypes.js";
import { EditorState } from "../EditorState.js";
import { updateDocumentSections } from "./sharedHelpers.js";
import { isTextBlock, TextRun } from "../../document/BlockTypes.js";
import { genId } from "../../utils/IdGenerator.js";

export function registerRevisionHandlers(): void {
  registerHandler(OperationType.TOGGLE_TRACK_CHANGES, (state) => {
    return {
      ...state,
      trackChangesEnabled: !state.trackChangesEnabled,
    };
  });

  registerHandler(OperationType.ACCEPT_REVISION, (state, op: AcceptRevisionOp) => {
    const { runId } = op.payload;
    return applyToAllRuns(state, (run) => {
      if (run.id !== runId || !run.revision) return run;
      if (run.revision.type === "insert") {
        // Accept insertion: keep text, remove revision mark
        const { revision: _, ...rest } = run;
        return rest as TextRun;
      } else {
        // Accept deletion: remove the run entirely
        return null;
      }
    });
  });

  registerHandler(OperationType.REJECT_REVISION, (state, op: RejectRevisionOp) => {
    const { runId } = op.payload;
    return applyToAllRuns(state, (run) => {
      if (run.id !== runId || !run.revision) return run;
      if (run.revision.type === "insert") {
        // Reject insertion: remove the run
        return null;
      } else {
        // Reject deletion: keep text, remove revision mark
        const { revision: _, ...rest } = run;
        return rest as TextRun;
      }
    });
  });
}

function applyToAllRuns(
  state: EditorState,
  updater: (run: TextRun) => TextRun | null,
): EditorState {
  const zone = state.editingMode;
  const nextSections = state.document.sections.map((section) => {
    const updateBlock = (block: any) => {
      if (!isTextBlock(block)) return block;
      const nextChildren = block.children
        .map(updater)
        .filter((r): r is TextRun => r !== null);
      return { ...block, children: nextChildren };
    };

    const updatedChildren = section.children.map(updateBlock);
    const updatedHeader = section.header?.map(updateBlock) ?? section.header;
    const updatedFooter = section.footer?.map(updateBlock) ?? section.footer;

    return {
      ...section,
      children: updatedChildren,
      header: updatedHeader,
      footer: updatedFooter,
    };
  });

  return {
    ...state,
    document: {
      ...state.document,
      revision: state.document.revision + 1,
      sections: nextSections,
    },
  };
}
