import { getOwner, onCleanup } from "solid-js";
import { isOpaqueChartClipboardType, readOpaqueChartToken, writeOpaqueChartToken } from "@/app/clipboard/opaqueChartClipboard.js";
import { prepareOpaqueChartPaste } from "./opaqueTransferTransaction.js";
import type { ClipboardIssue, ClipboardPasteMode } from "@/ui/app/clipboardPaste.js";
import { mergeClipboardFormatting } from "@/core/commands/clipboardMergeFormatting.js";
import {
  insertClipboardParagraphsAtSelection,
  serializeEditorSelectionToHtml,
  selectionContainsOpaqueObject,
} from "@/core/commands/clipboard.js";
import { getSelectedText } from "@/core/commands/selection.js";
import {
  deleteBackward,
  insertPlainTextAtSelection,
} from "@/core/commands/text.js";
import type { EditorPosition, EditorState } from "@/core/model.js";
import { parseEditorClipboardHtmlWithDom } from "@/app/clipboard/htmlClipboardParser.js";
import { findImageFileFromTransfer } from "@/ui/clipboardImage.js";
import type { EditorTransactionOptions } from "@/ui/editorHistory.js";

export interface EditorClipboardDeps {
  state: () => EditorState;
  /** Actual committed state, never the reactive facade. Required for async opaque paste. */
  stateSnapshot?: () => EditorState;
  onNativeClipboardIssue?: (action:"copy"|"cut"|"paste",issue:ClipboardIssue) => void;
  isReadOnly: () => boolean;
  forcePlainTextPaste: () => boolean;
  consumePasteMode?: () => ClipboardPasteMode | undefined;
  onNativeClipboardSuccess?: () => void;
  onNativeClipboardStart?: () => void;
  clipboardRequestGeneration?: () => number;
  setForcePlainTextPaste: (value: boolean) => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  applyTransactionalState: (
    transform: (state: EditorState) => EditorState,
    options?: EditorTransactionOptions,
  ) => void;
  applyTableAwareParagraphEdit: (
    state: EditorState,
    edit: (state: EditorState) => EditorState,
  ) => EditorState;
  focusInput: () => void;
  insertImageFromFile: (
    file: File,
    position?: EditorPosition | null,
  ) => Promise<void>;
  resolvePositionAtSurfacePoint: (
    clientX: number,
    clientY: number,
  ) => EditorPosition | null;
}

export function createEditorClipboardController(
  deps: EditorClipboardDeps,
): ReturnType<typeof createEditorClipboardControllerImpl> {
  return createEditorClipboardControllerImpl(deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createEditorClipboardControllerImpl(deps: EditorClipboardDeps) {
  let request=0;
  if(getOwner())onCleanup(()=>{request++;});
  const handleCopy = (
    event: ClipboardEvent & { currentTarget: HTMLTextAreaElement },
  ): void => {
    request++;
    deps.onNativeClipboardStart?.();
    if (selectionContainsOpaqueObject(deps.state())) {
      event.preventDefault();
      if(event.clipboardData&&writeOpaqueChartToken(deps.stateSnapshot?.()??deps.state(),event.clipboardData)){
        deps.onNativeClipboardSuccess?.();
      }else deps.onNativeClipboardIssue?.("copy","unsupported");
      return;
    }
    const text = getSelectedText(deps.state());
    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    if (!event.clipboardData) return;
    try {
      event.clipboardData.setData("text/plain", text);
      event.clipboardData.setData(
        "text/html",
        serializeEditorSelectionToHtml(deps.state()),
      );
    } catch {
      return;
    }
    deps.onNativeClipboardSuccess?.();
  };

  const handleCut = (
    event: ClipboardEvent & { currentTarget: HTMLTextAreaElement },
  ): void => {
    request++;
    deps.onNativeClipboardStart?.();
    if (deps.isReadOnly()) {
      event.preventDefault();
      return;
    }
    if (selectionContainsOpaqueObject(deps.state())) {
      event.preventDefault();
      deps.onNativeClipboardIssue?.("cut","unsupported");
      return;
    }
    const text = getSelectedText(deps.state());
    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    if (!event.clipboardData) return;
    try {
      event.clipboardData.setData("text/plain", text);
      event.clipboardData.setData(
        "text/html",
        serializeEditorSelectionToHtml(deps.state()),
      );
    } catch {
      return;
    }
    deps.onNativeClipboardSuccess?.();
    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();
    deps.applyTransactionalState((current): EditorState =>
      deps.applyTableAwareParagraphEdit(current, (temp): EditorState =>
        deleteBackward(temp),
      ),
    );
    deps.focusInput();
  };

  const handlePaste = (
    event: ClipboardEvent & { currentTarget: HTMLTextAreaElement },
  ): void | Promise<void> => {
    const id=++request;
    if (deps.isReadOnly()) {
      event.preventDefault();
      return;
    }
    const fallbackMode = deps.consumePasteMode?.();
    const generation=deps.clipboardRequestGeneration?.();
    const superseded=():boolean=>id!==request||deps.clipboardRequestGeneration?.()!==generation;
    // A recognized custom format is exclusive; malformed, expired or foreign
    // tokens never fall through into a lossy plain/HTML/image paste.
    const chartTypes=Array.from(event.clipboardData?.types??[]).filter(isOpaqueChartClipboardType);
    if(event.clipboardData&&chartTypes.length){
      event.preventDefault();
      const plain=deps.forcePlainTextPaste();
      deps.setForcePlainTextPaste(false);
      const manifest=chartTypes.length===1?readOpaqueChartToken(event.clipboardData.getData(chartTypes[0]!)):undefined;
      const snapshot=deps.stateSnapshot?.();
      if(plain||(fallbackMode&&fallbackMode!=="rich")||!manifest||!snapshot){
        deps.onNativeClipboardIssue?.("paste","unsupported");
        return;
      }
      event.currentTarget.value="";
      // Keep a real committed snapshot across awaits. The public state facade
      // can be a live Proxy whose reference never changes as the user edits.
      return (async()=>{
        let next:EditorState;
        try{
          next=await prepareOpaqueChartPaste(snapshot,manifest);
        }catch{
          if(!superseded()&&!deps.isReadOnly())deps.onNativeClipboardIssue?.("paste","unsupported");
          return;
        }
        if(superseded()||deps.isReadOnly())return;
        if(deps.stateSnapshot?.()!==snapshot){
          deps.onNativeClipboardIssue?.("paste","document-changed");
          return;
        }
        let committed=false;
        deps.clearPreferredColumn();
        deps.resetTransactionGrouping();
        deps.applyTransactionalState(current=>{
          if(superseded()||deps.isReadOnly()||current!==snapshot)return current;
          committed=true;
          return next;
        });
        if(committed){
          deps.onNativeClipboardSuccess?.();
          deps.focusInput();
        }else deps.onNativeClipboardIssue?.("paste","document-changed");
      })();
    }
    if (deps.forcePlainTextPaste() || fallbackMode === "text") {
      deps.setForcePlainTextPaste(false);
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (text.length === 0) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      deps.applyTransactionalState((current): EditorState =>
        deps.applyTableAwareParagraphEdit(current, (temp): EditorState =>
          insertPlainTextAtSelection(temp, text),
        ),
      );
      event.currentTarget.value = "";
      deps.focusInput();
      return;
    }

    const imageFile =
      fallbackMode !== "merge"
        ? findImageFileFromTransfer(event.clipboardData)
        : null;
    if (imageFile) {
      event.preventDefault();
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      void deps.insertImageFromFile(imageFile);
      event.currentTarget.value = "";
      deps.focusInput();
      return;
    }

    const html = event.clipboardData?.getData("text/html") ?? "";
    const parsed = parseEditorClipboardHtmlWithDom(html);
    const paragraphs =
      fallbackMode === "merge"
        ? mergeClipboardFormatting(deps.state(), parsed)
        : parsed;
    if (paragraphs.length > 0) {
      event.preventDefault();
      deps.clearPreferredColumn();
      deps.resetTransactionGrouping();
      deps.applyTransactionalState((current): EditorState =>
        deps.applyTableAwareParagraphEdit(current, (temp): EditorState =>
          insertClipboardParagraphsAtSelection(temp, paragraphs),
        ),
      );
      event.currentTarget.value = "";
      deps.focusInput();
      return;
    }

    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();
    deps.applyTransactionalState((current): EditorState =>
      deps.applyTableAwareParagraphEdit(current, (temp): EditorState =>
        insertPlainTextAtSelection(temp, text),
      ),
    );
    event.currentTarget.value = "";
    deps.focusInput();
  };

  const handleDrop = (event: DragEvent): void => {
    request++;
    deps.onNativeClipboardStart?.();
    if (deps.isReadOnly()) {
      event.preventDefault();
      return;
    }
    const imageFile = findImageFileFromTransfer(event.dataTransfer);
    if (!imageFile) {
      return;
    }

    event.preventDefault();
    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();
    const position =
      deps.resolvePositionAtSurfacePoint(event.clientX, event.clientY) ??
      deps.state().selection.focus;
    void deps.insertImageFromFile(imageFile, position);
    deps.focusInput();
  };

  return {
    handleCopy,
    handleCut,
    handlePaste,
    handleDrop,
  };
}
