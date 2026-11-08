import { insertClipboardParagraphsAtSelection } from "@/core/commands/clipboard.js";
import { insertPlainTextAtSelection } from "@/core/commands/text.js";
import { mergeClipboardFormatting } from "@/core/commands/clipboardMergeFormatting.js";
import type { EditorState } from "@/core/model.js";
import { parseEditorClipboardHtmlWithDom } from "@/app/clipboard/htmlClipboardParser.js";

export type ClipboardPasteMode = "rich" | "text" | "merge";

export interface ClipboardPasteDeps {
  state: () => EditorState;
  isReadOnly: () => boolean;
  applyTransactionalState: (producer: (current: EditorState) => EditorState) => void;
  applyTableAwareParagraphEdit: (
    state: EditorState,
    edit: (state: EditorState) => EditorState,
  ) => EditorState;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  focusInput: () => void;
  onError?: (error: unknown) => void;
}

/** A permissions prompt may still deny access at runtime. */
export function canReadSystemClipboard(): boolean {
  return typeof navigator !== "undefined" &&
    Boolean(navigator.clipboard?.read || navigator.clipboard?.readText);
}

/** Clipboard reads must start on the initiating user gesture. */
async function readClipboard(
  mode: ClipboardPasteMode,
): Promise<{ text: string; html: string } | null> {
  const clipboard = navigator.clipboard;
  if (!clipboard) return null;

  if (mode === "text" && clipboard.readText) {
    try {
      return { text: await clipboard.readText(), html: "" };
    } catch {
      // Some providers only support read().
    }
  }
  if (clipboard.read) {
    try {
      const items = await clipboard.read();
      let html = "";
      let text = "";
      for (const item of items) {
        if (mode !== "text" && item.types.includes("text/html")) {
          html = await (await item.getType("text/html")).text();
        }
        if (item.types.includes("text/plain")) {
          text = await (await item.getType("text/plain")).text();
        }
      }
      if (html || text) return { html, text };
    } catch {
      // Fallback to readText; a rejected permission leaves the document intact.
    }
  }
  if (clipboard.readText) {
    try {
      return { text: await clipboard.readText(), html: "" };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Insert clipboard content at the selection captured before the asynchronous
 * read. Abort if the document has changed during the permission prompt instead
 * of applying stale offsets. Native paste events still handle image-only paste.
 */
export async function pasteFromSystemClipboard(
  deps: ClipboardPasteDeps,
  mode: ClipboardPasteMode,
): Promise<boolean> {
  if (deps.isReadOnly() || !canReadSystemClipboard()) return false;
  const snapshot = deps.state();
  const selection = {
    anchor: { ...snapshot.selection.anchor },
    focus: { ...snapshot.selection.focus },
  };
  let content: { text: string; html: string } | null;
  try {
    content = await readClipboard(mode);
  } catch (error) {
    deps.onError?.(error);
    return false;
  }
  if (!content || deps.isReadOnly() || deps.state().document !== snapshot.document) {
    return false;
  }
  const parsed = mode !== "text"
    ? parseEditorClipboardHtmlWithDom(content.html)
    : [];
  const paragraphs = mode === "merge"
    ? mergeClipboardFormatting({ ...snapshot, selection }, parsed)
    : parsed;
  if (paragraphs.length === 0 && content.text.length === 0) return false;

  deps.clearPreferredColumn();
  deps.resetTransactionGrouping();
  let changed = false;
  deps.applyTransactionalState((current): EditorState => {
    if (current.document !== snapshot.document || deps.isReadOnly()) return current;
    const positioned = { ...current, selection };
    const next = deps.applyTableAwareParagraphEdit(
      positioned,
      (editing): EditorState => paragraphs.length > 0
        ? insertClipboardParagraphsAtSelection(editing, paragraphs)
        : insertPlainTextAtSelection(editing, content.text),
    );
    changed = next.document !== current.document;
    return next;
  });
  if (changed) deps.focusInput();
  return changed;
}
