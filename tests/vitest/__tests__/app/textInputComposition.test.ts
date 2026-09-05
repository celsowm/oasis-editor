import { describe, it, expect, beforeEach } from "vitest";
import { createRoot } from "solid-js";
import { createEditorTextInput } from "@/app/controllers/useEditorTextInput.js";
import { createEditorStateFromTexts } from "@/core/editorState.js";
import { getParagraphs, type EditorState } from "@/core/model.js";
import {
  applyEditorHistoryTransaction,
  createEmptyEditorHistoryState,
  type EditorHistoryState,
} from "@/ui/editorHistory.js";

interface Harness {
  input: ReturnType<typeof createEditorTextInput>;
  textarea: HTMLTextAreaElement;
  text: () => string;
  undoDepth: () => number;
  readOnly: boolean;
}

function createHarness(initial = "abc", offset = 3): Harness {
  let state: EditorState = createEditorStateFromTexts([initial], { offset });
  let history: EditorHistoryState = createEmptyEditorHistoryState();
  const harness: Partial<Harness> = { readOnly: false };

  const input = createRoot(
    (): ReturnType<typeof createEditorTextInput> =>
      createEditorTextInput({
        state: (): EditorState => state,
        isReadOnly: (): boolean => Boolean(harness.readOnly),
        logger: { debug: (): void => {}, info: (): void => {} },
        clearPreferredColumn: (): void => {},
        pendingCaretTextStyle: (): undefined => undefined,
        applyTransactionalState: (producer, options): void => {
          const next = producer(state);
          if (next === state) {
            return;
          }
          history = applyEditorHistoryTransaction(
            history,
            state,
            next,
            options,
          );
          state = next;
        },
        applyTableAwareParagraphEdit: (current, edit): EditorState =>
          edit(current),
        focusInput: (): void => {},
      }),
  );

  harness.input = input;
  harness.textarea = { value: "" } as HTMLTextAreaElement;
  harness.text = (): string =>
    getParagraphs(state)[0]
      .runs.map((run): string => run.text)
      .join("");
  harness.undoDepth = (): number => history.undoStack.length;
  return harness as Harness;
}

function compositionEvent(
  harness: Harness,
  data: string | null,
): CompositionEvent & { currentTarget: HTMLTextAreaElement } {
  return { data, currentTarget: harness.textarea } as CompositionEvent & {
    currentTarget: HTMLTextAreaElement;
  };
}

function inputEvent(
  harness: Harness,
  value: string,
): InputEvent & { currentTarget: HTMLTextAreaElement } {
  harness.textarea.value = value;
  return { currentTarget: harness.textarea } as InputEvent & {
    currentTarget: HTMLTextAreaElement;
  };
}

describe("IME composition preview", () => {
  let harness: Harness;

  beforeEach((): void => {
    harness = createHarness();
  });

  it("shows composing text in the document before it is committed", () => {
    harness.input.handleCompositionStart();
    harness.input.handleCompositionUpdate(compositionEvent(harness, "c"));
    expect(harness.text()).toBe("abcc");
    harness.input.handleCompositionUpdate(compositionEvent(harness, "ca"));
    expect(harness.text()).toBe("abcca");
    harness.input.handleCompositionUpdate(compositionEvent(harness, "cas"));
    harness.input.handleCompositionUpdate(compositionEvent(harness, "casa"));
    expect(harness.text()).toBe("abccasa");
  });

  it("commits the final text exactly once", () => {
    harness.input.handleCompositionStart();
    harness.input.handleCompositionUpdate(compositionEvent(harness, "ca"));
    harness.input.handleCompositionUpdate(compositionEvent(harness, "casa"));
    harness.input.handleCompositionEnd(compositionEvent(harness, "casa"));
    expect(harness.text()).toBe("abccasa");
  });

  it("ignores the duplicate input event Chrome fires after compositionend", () => {
    harness.input.handleCompositionStart();
    harness.input.handleCompositionUpdate(compositionEvent(harness, "casa"));
    harness.input.handleCompositionEnd(compositionEvent(harness, "casa"));
    harness.input.handleTextInput(inputEvent(harness, "casa"));
    expect(harness.text()).toBe("abccasa");
  });

  it("still inserts a legitimate repeat of the committed text", () => {
    harness.input.handleCompositionStart();
    harness.input.handleCompositionUpdate(compositionEvent(harness, "x"));
    harness.input.handleCompositionEnd(compositionEvent(harness, "x"));
    harness.input.handleTextInput(inputEvent(harness, "x"));
    expect(harness.text()).toBe("abcx");
    harness.input.handleTextInput(inputEvent(harness, "x"));
    expect(harness.text()).toBe("abcxx");
  });

  it("retracts the preview when the composition is cancelled", () => {
    harness.input.handleCompositionStart();
    harness.input.handleCompositionUpdate(compositionEvent(harness, "cas"));
    expect(harness.text()).toBe("abccas");
    harness.input.handleCompositionEnd(compositionEvent(harness, ""));
    expect(harness.text()).toBe("abc");
  });

  it("falls back to the textarea value when compositionupdate has no data", () => {
    harness.input.handleCompositionStart();
    harness.input.handleTextInput(inputEvent(harness, "ca"));
    expect(harness.text()).toBe("abcca");
    harness.input.handleTextInput(inputEvent(harness, "casa"));
    expect(harness.text()).toBe("abccasa");
    harness.input.handleCompositionEnd(compositionEvent(harness, "casa"));
    expect(harness.text()).toBe("abccasa");
  });

  it("collapses the whole composition into a single undo step", () => {
    const before = harness.undoDepth();
    harness.input.handleCompositionStart();
    harness.input.handleCompositionUpdate(compositionEvent(harness, "c"));
    harness.input.handleCompositionUpdate(compositionEvent(harness, "ca"));
    harness.input.handleCompositionUpdate(compositionEvent(harness, "cas"));
    harness.input.handleCompositionEnd(compositionEvent(harness, "casa"));
    expect(harness.undoDepth()).toBe(before + 1);
  });

  it("ignores composition entirely when read-only", () => {
    harness.readOnly = true;
    harness.input.handleCompositionStart();
    harness.input.handleCompositionUpdate(compositionEvent(harness, "casa"));
    harness.input.handleCompositionEnd(compositionEvent(harness, "casa"));
    expect(harness.text()).toBe("abc");
  });
});
