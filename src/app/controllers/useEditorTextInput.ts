import { createSignal } from "solid-js";
import type { EditorState, EditorTextStyle } from "../../core/model.js";
import { getParagraphs } from "../../core/model.js";
import { insertTextAtSelection } from "../../core/editorCommands.js";
import { cloneStyle } from "../../core/textStyle/textStyleMutations.js";
import { markStart, markEnd } from "../../utils/performanceMetrics.js";

export interface UseEditorTextInputProps {
  state: () => EditorState;
  isReadOnly: () => boolean;
  logger: { debug: (msg: string) => void; info: (msg: string) => void };
  clearPreferredColumn: () => void;
  pendingCaretTextStyle: () => EditorTextStyle | undefined;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: string },
  ) => void;
  applyTableAwareParagraphEdit: (
    state: EditorState,
    edit: (temp: EditorState) => EditorState,
  ) => EditorState;
  focusInput: () => void;
}

export function createEditorTextInput(deps: UseEditorTextInputProps) {
  const [composing, setComposing] = createSignal(false);
  let suppressedInputText: string | null = null;

  const handleTextInput = (
    event: InputEvent & { currentTarget: HTMLTextAreaElement },
  ) => {
    markStart("input:text");
    if (deps.isReadOnly()) {
      deps.logger.debug(
        `input:readonly ignored value=${JSON.stringify(event.currentTarget.value)}`,
      );
      event.currentTarget.value = "";
      return;
    }
    const text = event.currentTarget.value;
    if (text.length === 0) {
      return;
    }

    if (composing()) {
      deps.logger.debug(`input:composing buffer=${JSON.stringify(text)}`);
      return;
    }

    if (suppressedInputText !== null && text === suppressedInputText) {
      deps.logger.debug(`input:suppressed text=${JSON.stringify(text)}`);
      suppressedInputText = null;
      event.currentTarget.value = "";
      return;
    }

    const state = deps.state();
    const sel = state.selection;
    const currentRun = getParagraphs(state)
      .find((p) => p.id === sel.anchor.paragraphId)
      ?.runs.find((r) => r.id === sel.anchor.runId);
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
      (current) =>
        deps.applyTableAwareParagraphEdit(current, (temp) =>
          insertTextAtSelection(temp, text, pendingStyle),
        ),
      {
        mergeKey: "insertText",
      },
    );
    event.currentTarget.value = "";
    deps.focusInput();
    markEnd("input:text");
  };

  const handleCompositionStart = () => {
    deps.logger.debug("input:composition start");
    setComposing(true);
  };

  const handleCompositionEnd = (
    event: CompositionEvent & { currentTarget: HTMLTextAreaElement },
  ) => {
    if (deps.isReadOnly()) {
      event.currentTarget.value = "";
      setComposing(false);
      return;
    }
    const text = event.data ?? event.currentTarget.value;
    setComposing(false);

    if (text.length === 0) {
      event.currentTarget.value = "";
      return;
    }

    const state = deps.state();
    const sel = state.selection;
    deps.logger.info(
      `input:composition end ${JSON.stringify(text)} (len=${text.length}) at ${sel.anchor.paragraphId}:${sel.anchor.runId}[${sel.anchor.offset}]`,
    );
    suppressedInputText = text;
    deps.clearPreferredColumn();
    const pendingStyle = cloneStyle(deps.pendingCaretTextStyle());
    deps.applyTransactionalState(
      (current) =>
        deps.applyTableAwareParagraphEdit(current, (temp) =>
          insertTextAtSelection(temp, text, pendingStyle),
        ),
      {
        mergeKey: "insertText",
      },
    );
    event.currentTarget.value = "";
    deps.focusInput();
  };

  return {
    handleTextInput,
    handleCompositionStart,
    handleCompositionEnd,
    composing,
  };
}
