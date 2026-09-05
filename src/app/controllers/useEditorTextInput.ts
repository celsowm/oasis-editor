import { MERGE_KEYS, type MergeKey } from "@/core/transactionMergeKeys.js";
import { createSignal } from "solid-js";
import type { EditorState, EditorTextStyle } from "@/core/model.js";
import { getParagraphs } from "@/core/model.js";
import {
  deleteCharsBackwardRaw,
  insertTextAtSelection,
} from "@/core/commands/text.js";
import { cloneStyle } from "@/core/textStyle/textStyleMutations.js";
import { markStart, markEnd } from "@/utils/performanceMetrics.js";

export interface UseEditorTextInputProps {
  state: () => EditorState;
  isReadOnly: () => boolean;
  logger: { debug: (msg: string) => void; info: (msg: string) => void };
  clearPreferredColumn: () => void;
  pendingCaretTextStyle: () => EditorTextStyle | undefined;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: MergeKey },
  ) => void;
  applyTableAwareParagraphEdit: (
    state: EditorState,
    edit: (temp: EditorState) => EditorState,
  ) => EditorState;
  focusInput: () => void;
}

export function createEditorTextInput(
  deps: UseEditorTextInputProps,
): ReturnType<typeof createEditorTextInputImpl> {
  return createEditorTextInputImpl(deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createEditorTextInputImpl(deps: UseEditorTextInputProps) {
  const [composing, setComposing] = createSignal(false);

  // Mobile keyboards (GBoard) and desktop IMEs keep a word "in composition"
  // until it is committed. We mirror the composing text into the document so it
  // paints on the canvas, and retract it before applying each update.
  let previewLength = 0;
  let previewText = "";
  let compositionStyle: EditorTextStyle | undefined;
  // The `input` event Chrome fires right after `compositionend` repeats the
  // committed text; it must not be inserted a second time.
  let justCommitted: string | null = null;

  const resetComposition = (): void => {
    previewLength = 0;
    previewText = "";
    compositionStyle = undefined;
  };

  /**
   * Replaces the composition preview currently in the document with `text`.
   * Delete + insert happen inside a single transaction so the whole composition
   * collapses into one undo step.
   */
  const applyCompositionText = (text: string, isFinal: boolean): void => {
    if (!isFinal && text === previewText) {
      return;
    }
    if (previewLength === 0 && text.length === 0) {
      if (isFinal) {
        resetComposition();
      }
      return;
    }

    const retracted = previewLength;
    const pendingStyle = cloneStyle(compositionStyle);
    deps.clearPreferredColumn();
    deps.applyTransactionalState(
      (current): EditorState =>
        deps.applyTableAwareParagraphEdit(current, (temp): EditorState => {
          const cleared = deleteCharsBackwardRaw(temp, retracted);
          return text.length > 0
            ? insertTextAtSelection(cleared, text, pendingStyle)
            : cleared;
        }),
      { mergeKey: MERGE_KEYS.composition },
    );

    if (isFinal) {
      resetComposition();
      justCommitted = text.length > 0 ? text : null;
    } else {
      previewLength = text.length;
      previewText = text;
    }
  };

  const handleTextInput = (
    event: InputEvent & { currentTarget: HTMLTextAreaElement },
  ): void => {
    markStart("input:text");
    if (deps.isReadOnly()) {
      deps.logger.debug(
        `input:readonly ignored value=${JSON.stringify(event.currentTarget.value)}`,
      );
      event.currentTarget.value = "";
      resetComposition();
      return;
    }
    const text = event.currentTarget.value;
    if (text.length === 0) {
      return;
    }

    if (composing()) {
      // Fallback for browsers whose `compositionupdate.data` is empty; the
      // guard in `applyCompositionText` makes this idempotent when both fire.
      deps.logger.debug(`input:composing buffer=${JSON.stringify(text)}`);
      applyCompositionText(text, false);
      return;
    }

    if (justCommitted !== null) {
      const wasCommitted = text === justCommitted;
      justCommitted = null;
      if (wasCommitted) {
        deps.logger.debug(`input:suppressed text=${JSON.stringify(text)}`);
        event.currentTarget.value = "";
        return;
      }
    }

    const state = deps.state();
    const sel = state.selection;
    const currentRun = getParagraphs(state)
      .find((p): boolean => p.id === sel.anchor.paragraphId)
      ?.runs.find((r): boolean => r.id === sel.anchor.runId);
    const runStyle = currentRun
      ? {
          bold: currentRun.styles?.bold,
          italic: currentRun.styles?.italic,
          underline: currentRun.styles?.underline,
        }
      : null;
    deps.logger.info(
      `input:text ${JSON.stringify(text)} (len=${text.length}) at ${sel.anchor.paragraphId}:${sel.anchor.runId}[${sel.anchor.offset}] run:${JSON.stringify(runStyle)}`,
    );
    deps.clearPreferredColumn();
    const pendingStyle = cloneStyle(deps.pendingCaretTextStyle());
    deps.applyTransactionalState(
      (current): EditorState =>
        deps.applyTableAwareParagraphEdit(
          current,
          (temp): EditorState =>
            insertTextAtSelection(temp, text, pendingStyle),
        ),
      {
        mergeKey: MERGE_KEYS.insertText,
      },
    );
    event.currentTarget.value = "";
    deps.focusInput();
    markEnd("input:text");
  };

  const handleCompositionStart = (): void => {
    deps.logger.debug("input:composition start");
    resetComposition();
    justCommitted = null;
    // Captured once: after the first preview insertion the caret sits inside
    // the inserted run, so the pending style would no longer be reported.
    compositionStyle = cloneStyle(deps.pendingCaretTextStyle());
    setComposing(true);
  };

  const handleCompositionUpdate = (
    event: CompositionEvent & { currentTarget: HTMLTextAreaElement },
  ): void => {
    if (deps.isReadOnly()) {
      return;
    }
    // Do not clear `currentTarget.value` here: that would break the IME.
    applyCompositionText(event.data ?? "", false);
  };

  const handleCompositionEnd = (
    event: CompositionEvent & { currentTarget: HTMLTextAreaElement },
  ): void => {
    setComposing(false);
    if (deps.isReadOnly()) {
      event.currentTarget.value = "";
      resetComposition();
      return;
    }

    const text = event.data ?? event.currentTarget.value;
    const state = deps.state();
    const sel = state.selection;
    deps.logger.info(
      `input:composition end ${JSON.stringify(text)} (len=${text.length}) at ${sel.anchor.paragraphId}:${sel.anchor.runId}[${sel.anchor.offset}]`,
    );
    // Handles a cancelled composition too: empty text retracts the preview.
    applyCompositionText(text, true);
    event.currentTarget.value = "";
    deps.focusInput();
  };

  return {
    handleTextInput,
    handleCompositionStart,
    handleCompositionUpdate,
    handleCompositionEnd,
    composing,
  };
}
