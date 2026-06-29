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
 * `onStateChange` and emits the client `change`/`documentChange`/`selectionChange`
 * events. Must be called synchronously within the component owner so the effect
 * is tracked. Extracted from `OasisEditorApp` (S1).
 */
export function createEditorChangeBroadcast(
  deps: EditorChangeBroadcastDeps,
): void {
  createEffect((): void => {
    deps.state.document;
    deps.state.selection;
    deps.state.activeSectionIndex;
    deps.state.activeZone;
    recordCanvasDebugSelection(deps.state);
    if (deps.isImportInProgress()) {
      return;
    }
    const snapshot = deps.cloneState(deps.getStateSnapshot());
    deps.getOnStateChange()?.(snapshot);
    deps.emit("change", snapshot);
    deps.emit("documentChange", snapshot.document);
    deps.emit("selectionChange", snapshot.selection);
  });
}
