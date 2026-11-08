import { serializeEditorSelectionToHtml } from "@/core/commands/clipboard.js";
import { getSelectedText } from "@/core/commands/selection.js";
import { deleteBackward } from "@/core/commands/text.js";
import type { EditorState } from "@/core/model.js";
import type { ClipboardPasteDeps } from "./clipboardPaste.js";

/** Clipboard writes must be initiated from the user's gesture. */
export function canWriteSystemClipboard(): boolean {
  return (
    (typeof navigator !== "undefined" &&
      Boolean(navigator.clipboard?.write || navigator.clipboard?.writeText)) ||
    (typeof document !== "undefined" &&
      typeof document.execCommand === "function")
  );
}

function fallbackCopy(text: string): boolean {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") {
    return false;
  }
  const previous = document.activeElement;
  const field = document.createElement("textarea");
  field.value = text;
  field.readOnly = true;
  field.setAttribute("aria-hidden", "true");
  field.style.cssText = "position:fixed;opacity:0;left:-9999px;top:0";
  document.body.appendChild(field);
  try {
    field.focus({ preventScroll: true });
    field.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
    if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
  }
}

function writePlainText(text: string): Promise<boolean> {
  const api = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
  if (api?.writeText) {
    try {
      return api.writeText(text).then(
        () => true,
        () => fallbackCopy(text),
      );
    } catch {
      // Fall back synchronously when clipboard.writeText throws.
    }
  }
  return Promise.resolve(fallbackCopy(text));
}

/**
 * A rejected write always returns false. In particular, Cut must not delete
 * text because an asynchronous Clipboard API call was merely attempted.
 */
export function writeEditorSelectionToClipboard(
  snapshot: EditorState,
): Promise<boolean> {
  const text = getSelectedText(snapshot);
  if (!text) return Promise.resolve(false);
  const api = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
  if (api?.write && typeof ClipboardItem !== "undefined") {
    try {
      const html = serializeEditorSelectionToHtml(snapshot);
      const item = new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      });
      return api.write([item]).then(
        () => true,
        () => writePlainText(text),
      );
    } catch {
      // Browser may refuse ClipboardItem even when plain text is supported.
    }
  }
  return writePlainText(text);
}

/** Atomic undoable deletion, only after successful clipboard write. */
export async function cutEditorSelection(
  deps: ClipboardPasteDeps,
): Promise<boolean> {
  if (deps.isReadOnly()) return false;
  const snapshot = deps.state();
  if (!getSelectedText(snapshot)) return false;
  const copied = await writeEditorSelectionToClipboard(snapshot);
  if (!copied || deps.isReadOnly() || deps.state().document !== snapshot.document) {
    return false;
  }

  const selection = {
    anchor: { ...snapshot.selection.anchor },
    focus: { ...snapshot.selection.focus },
  };
  let changed = false;
  deps.clearPreferredColumn();
  deps.resetTransactionGrouping();
  deps.applyTransactionalState((current): EditorState => {
    if (deps.isReadOnly() || current.document !== snapshot.document) return current;
    const positioned = { ...current, selection };
    const next = deps.applyTableAwareParagraphEdit(
      positioned, (editing): EditorState => deleteBackward(editing),
    );
    changed = next.document !== current.document;
    return next;
  });
  if (changed) deps.focusInput();
  return changed;
}
