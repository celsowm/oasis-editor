import { describe, expect, it, vi } from "vitest";
import { createRoot, createSignal } from "solid-js";
import { createEditorAppState } from "@/ui/app/useEditorAppState.js";
import { createEditorStateFromTexts } from "@/core/editorState.js";
import { createEditorChangeBroadcast } from "@/ui/app/createEditorChangeBroadcast.js";
import { createOasisEditorClient } from "@/app/client/OasisEditorClient.js";
import { cloneEditorState } from "@/core/cloneState.js";
import { insertTextAtSelection } from "@/core/commands/text.js";

describe("editor change broadcasts", () => {
  it("keeps selection/view changes clean and does not replay imported changes", async () => {
    const c = createOasisEditorClient(),
      onStateChange = vi.fn(),
      documentChange = vi.fn(),
      selectionChange = vi.fn();
    c.on("documentChange", documentChange);
    c.on("selectionChange", selectionChange);
    const owner = createRoot((dispose) => {
      const app = createEditorAppState({
        initialState: createEditorStateFromTexts(["seed"]),
      });
      const [importing, setImporting] = createSignal(false);
      createEditorChangeBroadcast({
        state: app.state,
        isImportInProgress: importing,
        cloneState: cloneEditorState,
        getStateSnapshot: app.getStateSnapshot,
        getOnStateChange: () => onStateChange,
        emit: c.emit,
      });
      return { ...app, setImporting, dispose };
    });
    await Promise.resolve();
    expect(c.document.isDirty()).toBe(false);
    expect(documentChange).not.toHaveBeenCalled();
    let state = owner.getStateSnapshot();
    owner.commitState({
      ...state,
      selection: {
        anchor: { ...state.selection.anchor },
        focus: { ...state.selection.focus },
      },
    });
    await Promise.resolve();
    expect(c.document.isDirty()).toBe(false);
    expect(selectionChange).toHaveBeenCalledOnce();
    state = owner.getStateSnapshot();
    owner.commitState({ ...state, activeZone: "header" });
    await Promise.resolve();
    expect(c.document.isDirty()).toBe(false);
    expect(documentChange).not.toHaveBeenCalled();
    state = owner.getStateSnapshot();
    owner.commitState({ ...state, activeZone: "main" });
    await Promise.resolve();
    owner.commitState(insertTextAtSelection(owner.getStateSnapshot(), "edit"));
    await Promise.resolve();
    expect(c.document.isDirty()).toBe(true);
    expect(documentChange).toHaveBeenCalledOnce();
    c.document.markClean();
    owner.setImporting(true);
    owner.commitState(
      insertTextAtSelection(owner.getStateSnapshot(), "imported"),
    );
    await Promise.resolve();
    owner.setImporting(false);
    await Promise.resolve();
    expect(c.document.isDirty()).toBe(false);
    expect(documentChange).toHaveBeenCalledOnce();
    expect(onStateChange).toHaveBeenCalled();
    owner.dispose();
  });
});
