import { createSignal, getOwner, onCleanup } from "solid-js";
import { getSelectedText } from "@/core/commands/selection.js";
import { pasteFromSystemClipboard } from "./clipboardPaste.js";
import type {
  ClipboardIssue,
  ClipboardPasteDeps,
  ClipboardPasteMode,
} from "./clipboardPaste.js";
import {
  cutEditorSelection,
  writeEditorSelectionToClipboard,
} from "./clipboardWrite.js";

export interface ClipboardNotice {
  action: "copy" | "cut" | "paste";
  issue: ClipboardIssue;
  mode?: ClipboardPasteMode;
}

/** One editor's actions, feedback and single-use native-paste fallback. */
export function createEditorClipboardActions(
  deps: ClipboardPasteDeps,
): ReturnType<typeof createClipboardActions> {
  return createClipboardActions(deps);
}
export type EditorClipboardActions = ReturnType<
  typeof createEditorClipboardActions
>;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createClipboardActions(deps: ClipboardPasteDeps) {
  const [notice, setNotice] = createSignal<ClipboardNotice>();
  let request = 0;
  if (getOwner())
    onCleanup((): void => {
      request++;
    });
  let pendingPaste:
    | {
        document: ReturnType<typeof deps.state>["document"];
        mode: ClipboardPasteMode;
      }
    | undefined;
  const clear = (): void => {
    setNotice(undefined);
    pendingPaste = undefined;
  };
  const dismiss = (): void => {
    request++;
    clear();
  };
  const run = async (
    action: ClipboardNotice["action"],
    mode: ClipboardPasteMode = "rich",
  ): Promise<boolean> => {
    const id = ++request;
    clear();
    const snapshot = deps.state();
    const onIssue = (issue: ClipboardIssue): void => {
      if (id !== request) return;
      setNotice({ action, issue, ...(action === "paste" ? { mode } : {}) });
      if (issue === "access-denied" || issue === "unsupported") {
        if (action === "paste" && (issue !== "unsupported" || mode === "rich"))
          pendingPaste = { document: snapshot.document, mode };
        deps.focusInput();
      }
      deps.onIssue?.(issue);
    };
    if (action === "copy")
      return writeEditorSelectionToClipboard(snapshot, onIssue);
    const operationDeps = {
      ...deps,
      onIssue,
      isReadOnly: (): boolean => id !== request || deps.isReadOnly(),
    };
    if (action === "cut") return cutEditorSelection(operationDeps);
    return pasteFromSystemClipboard(operationDeps, mode);
  };
  const consumePasteMode = (): ClipboardPasteMode | undefined => {
    const pending = pendingPaste;
    dismiss();
    return pending?.document === deps.state().document
      ? pending.mode
      : undefined;
  };
  return {
    notice,
    dismiss,
    consumePasteMode,
    copy: (): Promise<boolean> => run("copy"),
    cut: (): Promise<boolean> => run("cut"),
    paste: (mode: ClipboardPasteMode = "rich"): Promise<boolean> =>
      run("paste", mode),
    hasSelection: (): boolean => getSelectedText(deps.state()).length > 0,
  };
}
