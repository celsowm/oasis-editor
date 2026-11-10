import { createEffect } from "solid-js";
import type { EditorState } from "@/core/model.js";
import type { OasisEditorClientController } from "@/app/client/OasisEditorClient.js";
import { recordCanvasDebugSelection } from "@/ui/canvas/CanvasDebug.js";

export interface EditorChangeBroadcastDeps {
  state: EditorState;
  isImportInProgress: () => boolean;
  cloneState: (state: EditorState) => EditorState;
  getStateSnapshot: () => EditorState;
  getOnStateChange: () => ((snapshot: EditorState) => void) | undefined;
  emit: OasisEditorClientController["emit"];
}

/**
 * Sets up the reactive effect that mirrors document/selection changes out to the
 * host: records the canvas-debug selection, then (when not mid-import) notifies
 * `onStateChange` and emits document events only for immutable document changes,
 * with selection events tracked independently. Must be called within the owner so the effect
 * is tracked. Extracted from `OasisEditorApp` (S1).
 */
export function createEditorChangeBroadcast(
  deps: EditorChangeBroadcastDeps,
): void {
  let previousDocument = deps.state.document;
  let previousSelection = deps.state.selection;
  createEffect((): void => {
    const document = deps.state.document;
    const selection = deps.state.selection;
    const documentChanged = document !== previousDocument;
    const selectionChanged = selection !== previousSelection;
    previousDocument = document;
    previousSelection = selection;
    deps.state.activeSectionIndex;
    deps.state.activeZone;
    recordCanvasDebugSelection(deps.state);
    if (deps.isImportInProgress()) {
      return;
    }
    const snapshot = deps.cloneState(deps.getStateSnapshot());
    deps.getOnStateChange()?.(snapshot);
    if (documentChanged) {
      deps.emit("change", snapshot);
      deps.emit("documentChange", snapshot.document);
    }
    if (selectionChanged) deps.emit("selectionChange", snapshot.selection);
  });
}
