import { isOpaqueChartClipboardType, readOpaqueChartToken } from "@/app/clipboard/opaqueChartClipboard.js";
import { prepareOpaqueChartPaste } from "@/app/controllers/opaqueTransferTransaction.js";
import { insertClipboardParagraphsAtSelection } from "@/core/commands/clipboard.js";
import { insertPlainTextAtSelection } from "@/core/commands/text.js";
import { mergeClipboardFormatting } from "@/core/commands/clipboardMergeFormatting.js";
import type { EditorState } from "@/core/model.js";
import { parseEditorClipboardHtmlWithDom } from "@/app/clipboard/htmlClipboardParser.js";

export type ClipboardIssue =
  "access-denied" | "empty" | "unsupported" | "document-changed";

export type ClipboardPasteMode = "rich" | "text" | "merge";

export interface ClipboardPasteDeps {
  state: () => EditorState;
  /** Immutable committed state, not the live reactive facade. */
  stateSnapshot?: () => EditorState;
  isReadOnly: () => boolean;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
  ) => void;
  applyTableAwareParagraphEdit: (
    state: EditorState,
    edit: (state: EditorState) => EditorState,
  ) => EditorState;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  focusInput: () => void;
  onError?: (error: unknown) => void;
  onIssue?: (issue: ClipboardIssue) => void;
}

/** A permissions prompt may still deny access at runtime. */
export function canReadSystemClipboard(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.clipboard?.read || navigator.clipboard?.readText)
  );
}

/** Clipboard reads must start on the initiating user gesture. */
async function readClipboard(
  mode: ClipboardPasteMode,
): Promise<
  | { kind: "content"; text: string; html: string }
  | { kind: "chart"; token: string }
  | { kind: "empty" | "unsupported" }
> {
  const clipboard = navigator.clipboard;
  let lastError: unknown = new Error("Clipboard access unavailable");
  let readSucceeded = false;
  let unsupported = false;
  const readTextFirst = mode === "text" && Boolean(clipboard?.readText);
  if (readTextFirst) {
    try {
      const text = await clipboard.readText();
      return text ? { kind: "content", text, html: "" } : { kind: "empty" };
    } catch (error) {
      lastError = error;
    }
  }
  if (clipboard?.read) {
    try {
      const items = await clipboard.read();
      const charts=items.flatMap(item=>item.types.filter(isOpaqueChartClipboardType).map(type=>({item,type})));
      if(charts.length){
        // Once recognized, never fall through to ordinary content even if
        // the token is invalid or reading its Blob fails.
        if(charts.length!==1||mode!=="rich")return {kind:"unsupported"};
        try{
          const blob=await charts[0]!.item.getType(charts[0]!.type);
          if(blob.size>128)return {kind:"unsupported"};
          const token=await blob.text();
          return token.length<=128?{kind:"chart",token}:{kind:"unsupported"};
        }catch{return {kind:"unsupported"};}
      }
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
      if (html || text) return { kind: "content", html, text };
      readSucceeded = true;
      unsupported = items.length > 0;
    } catch (error) {
      lastError = error;
    }
  }
  if (!readTextFirst && clipboard?.readText) {
    try {
      const text = await clipboard.readText();
      if (text) return { kind: "content", text, html: "" };
      readSucceeded = true;
    } catch (error) {
      lastError = error;
    }
  }
  if (readSucceeded) return { kind: unsupported ? "unsupported" : "empty" };
  throw lastError;
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
  if (deps.isReadOnly()) return false;
  if (!canReadSystemClipboard()) {
    deps.onIssue?.("access-denied");
    return false;
  }
  const snapshot = deps.stateSnapshot?.()??deps.state();
  const selection = {
    anchor: { ...snapshot.selection.anchor },
    focus: { ...snapshot.selection.focus },
  };
  let content: Awaited<ReturnType<typeof readClipboard>>;
  try {
    content = await readClipboard(mode);
  } catch (error) {
    deps.onError?.(error);
    deps.onIssue?.("access-denied");
    return false;
  }
  if (deps.isReadOnly()) return false;
  if (deps.state().document !== snapshot.document) {
    deps.onIssue?.("document-changed");
    return false;
  }
  if(content.kind==="chart"){
    if(mode!=="rich"||!deps.stateSnapshot){deps.onIssue?.("unsupported");return false;}
    const manifest=readOpaqueChartToken(content.token);
    if(!manifest){deps.onIssue?.("unsupported");return false;}
    if(deps.stateSnapshot()!==snapshot){deps.onIssue?.("document-changed");return false;}
    let next:EditorState;
    try{next=await prepareOpaqueChartPaste(snapshot,manifest);}
    catch(error){
      if(!deps.isReadOnly()){deps.onError?.(error);deps.onIssue?.("unsupported");}
      return false;
    }
    if(deps.isReadOnly())return false;
    if(deps.stateSnapshot()!==snapshot){deps.onIssue?.("document-changed");return false;}
    let committed=false;
    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();
    deps.applyTransactionalState(current=>{
      if(deps.isReadOnly()||current!==snapshot)return current;
      committed=true;
      return next;
    });
    if(committed)deps.focusInput();
    else if(!deps.isReadOnly())deps.onIssue?.("document-changed");
    return committed;
  }
  if (content.kind !== "content") {
    deps.onIssue?.(content.kind);
    return false;
  }
  const parsed =
    mode !== "text" ? parseEditorClipboardHtmlWithDom(content.html) : [];
  const paragraphs =
    mode === "merge"
      ? mergeClipboardFormatting({ ...snapshot, selection }, parsed)
      : parsed;
  if (paragraphs.length === 0 && content.text.length === 0) {
    deps.onIssue?.("unsupported");
    return false;
  }

  deps.clearPreferredColumn();
  deps.resetTransactionGrouping();
  let changed = false;
  deps.applyTransactionalState((current): EditorState => {
    if (current.document !== snapshot.document || deps.isReadOnly())
      return current;
    const positioned = { ...current, selection };
    const next = deps.applyTableAwareParagraphEdit(
      positioned,
      (editing): EditorState =>
        paragraphs.length > 0
          ? insertClipboardParagraphsAtSelection(editing, paragraphs)
          : insertPlainTextAtSelection(editing, content.text),
    );
    changed = next.document !== current.document;
    return next;
  });
  if (changed) deps.focusInput();
  return changed;
}
