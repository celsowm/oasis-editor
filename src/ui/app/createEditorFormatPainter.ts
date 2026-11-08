import { createSignal } from "solid-js";
import type { EditorState } from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import {
  applyCapturedFormatPainter,
  captureFormatPainter,
  resolveFormatPainterTarget,
  type FormatPainterSnapshot,
} from "@/core/commands/formatPainter.js";

export type FormatPainterMode = "once" | "continuous" | null;

export interface EditorFormatPainterDeps {
  state: () => EditorState;
  isReadOnly: () => boolean;
  applyTransactionalState: (transform: (state: EditorState) => EditorState) => void;
  applyTableAwareParagraphEdit: (
    state: EditorState, transform: (state: EditorState) => EditorState,
  ) => EditorState;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  focusInput: () => void;
}

function selectionKey(state: EditorState): string {
  const paragraphs = getParagraphs(state);
  if (!paragraphs.length) return "";
  const range = normalizeSelection(state, paragraphs);
  return [
    state.activeSectionIndex ?? 0,
    state.activeZone ?? "main",
    range.start.paragraphId, range.startParagraphOffset,
    range.end.paragraphId, range.endParagraphOffset,
  ].join(":");
}

/**
 * Instance-local UI state. Source formatting is captured when armed.
 * Pointer selection is committed only after pointerup (never during drag),
 * and keyboard selection only on keyup.
 */
export function createEditorFormatPainter(deps: EditorFormatPainterDeps) {
  const [mode, setMode] = createSignal<FormatPainterMode>(null);
  let source: FormatPainterSnapshot | null = null;
  let sourceDocument: EditorState["document"] | null = null;
  let sourceSelectionKey = "";

  const cancel = (): void => {
    source = null;
    sourceDocument = null;
    sourceSelectionKey = "";
    setMode(null);
  };

  const canCapture = (): boolean =>
    !deps.isReadOnly() && getParagraphs(deps.state()).length > 0;

  const arm = (nextMode: Exclude<FormatPainterMode, null>): boolean => {
    if (!canCapture()) return false;
    const current = deps.state();
    const captured = captureFormatPainter(current);
    if (!captured) return false;
    source = captured;
    sourceDocument = current.document;
    sourceSelectionKey = selectionKey(current);
    setMode(nextMode);
    deps.focusInput();
    return true;
  };

  const applyToSelection = (origin: "pointer" | "keyboard"): boolean => {
    if (!source || !mode()) return false;
    if (deps.isReadOnly() || deps.state().document !== sourceDocument) {
      cancel();
      return false;
    }
    const snapshot = deps.state();
    if (selectionKey(snapshot) === sourceSelectionKey) return false;
    const target = resolveFormatPainterTarget(snapshot, origin === "pointer");
    if (!target) return false;

    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();
    let didChange = false;
    deps.applyTransactionalState((current): EditorState => {
      if (deps.isReadOnly() || current.document !== sourceDocument) return current;
      const next = deps.applyTableAwareParagraphEdit(
        { ...current, selection: target.selection },
        (editing): EditorState => applyCapturedFormatPainter(editing, source!),
      );
      didChange = next.document !== current.document;
      return next;
    });
    if (mode() === "once") cancel();
    if (didChange) deps.focusInput();
    return didChange;
  };

  return {
    mode,
    canCapture,
    armOnce: (): boolean => arm("once"),
    armContinuous: (): boolean => arm("continuous"),
    cancel,
    applyToSelection,
  };
}

export type EditorFormatPainter = ReturnType<typeof createEditorFormatPainter>;
