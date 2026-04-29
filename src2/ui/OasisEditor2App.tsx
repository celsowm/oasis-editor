import { createEffect, createSignal, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { EditorSurface } from "./components/EditorSurface.js";
import { CaretOverlay } from "./components/CaretOverlay.js";
import { SelectionOverlay } from "./components/SelectionOverlay.js";
import { getCaretSlotRects } from "./caretGeometry.js";
import {
  measureParagraphLayoutFromRects,
  resolveClosestOffsetInMeasuredLayout,
} from "./layoutProjection.js";
import {
  deleteBackward,
  deleteForward,
  extendSelectionDown,
  extendSelectionLeft,
  extendSelectionRight,
  extendSelectionUp,
  getSelectedText,
  insertPlainTextAtSelection,
  insertTextAtSelection,
  moveSelectionDown,
  moveSelectionLeft,
  moveSelectionRight,
  moveSelectionUp,
  setSelection,
  splitBlockAtSelection,
  toggleTextStyle,
} from "../core/editorCommands.js";
import { createInitialEditor2State } from "../core/editorState.js";
import {
  getParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
  type Editor2Position,
  type Editor2State,
} from "../core/model.js";
import { isSelectionCollapsed, normalizeSelection } from "../core/selection.js";

interface InputBox {
  left: number;
  top: number;
  height: number;
}

interface CaretBox extends InputBox {
  visible: boolean;
}

interface SelectionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface TransactionOptions {
  mergeKey?: string;
}

function collectCharRects(blockElement: HTMLElement): Array<{
  left: number;
  right: number;
  top: number;
  bottom: number;
  height: number;
}> {
  return Array.from(blockElement.querySelectorAll<HTMLElement>("[data-char-index]")).map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
    };
  });
}

function resolveClickOffset(
  event: MouseEvent & { currentTarget: HTMLParagraphElement },
  layoutParagraph: ReturnType<typeof measureParagraphLayoutFromRects>,
): number {
  if (layoutParagraph.text.length === 0) {
    return 0;
  }
  return Math.max(
    0,
    Math.min(
      layoutParagraph.text.length,
      resolveClosestOffsetInMeasuredLayout(layoutParagraph, event.clientX, event.clientY),
    ),
  );
}

function isWordCharacter(char: string): boolean {
  return /[\p{L}\p{N}_]/u.test(char);
}

function resolveWordSelection(text: string, offset: number): { start: number; end: number } {
  if (text.length === 0) {
    return { start: 0, end: 0 };
  }

  const clampedOffset = Math.max(0, Math.min(offset, text.length));
  const index =
    clampedOffset === text.length ? Math.max(0, clampedOffset - 1) : clampedOffset;
  const charAtIndex = text[index];

  if (!charAtIndex || !isWordCharacter(charAtIndex)) {
    return {
      start: clampedOffset,
      end: Math.min(text.length, clampedOffset + 1),
    };
  }

  let start = index;
  let end = index + 1;

  while (start > 0 && isWordCharacter(text[start - 1])) {
    start -= 1;
  }

  while (end < text.length && isWordCharacter(text[end])) {
    end += 1;
  }

  return { start, end };
}

export function OasisEditor2App() {
  const [state, setState] = createStore<Editor2State>(createInitialEditor2State());
  const [focused, setFocused] = createSignal(false);
  const [composing, setComposing] = createSignal(false);
  const [inputBox, setInputBox] = createSignal<InputBox>({ left: 0, top: 0, height: 28 });
  const [preferredColumnX, setPreferredColumnX] = createSignal<number | null>(null);
  const [undoStack, setUndoStack] = createSignal<Editor2State[]>([]);
  const [redoStack, setRedoStack] = createSignal<Editor2State[]>([]);
  const [selectionBoxes, setSelectionBoxes] = createSignal<SelectionBox[]>([]);
  const [caretBox, setCaretBox] = createSignal<CaretBox>({
    left: 0,
    top: 0,
    height: 28,
    visible: false,
  });
  let surfaceRef: HTMLDivElement | undefined;
  let textareaRef: HTMLTextAreaElement | undefined;
  let syncRequestId = 0;
  let dragAnchor: Editor2Position | null = null;
  let lastTransactionMeta: { mergeKey: string; timestamp: number } | null = null;
  let suppressedInputText: string | null = null;

  const cloneState = (source: Editor2State): Editor2State => ({
    document: {
      ...source.document,
      blocks: source.document.blocks.map((paragraph) => ({
        ...paragraph,
        runs: paragraph.runs.map((run) => ({ ...run })),
      })),
    },
    selection: {
      anchor: { ...source.selection.anchor },
      focus: { ...source.selection.focus },
    },
  });

  const applyState = (nextState: Editor2State) => {
    setState(nextState);
  };

  const applyHistoryState = (nextState: Editor2State) => {
    setState(cloneState(nextState));
  };

  const resetTransactionGrouping = () => {
    lastTransactionMeta = null;
  };

  const applyTransactionalState = (
    producer: (current: Editor2State) => Editor2State,
    options?: TransactionOptions,
  ) => {
    const previous = cloneState(state);
    const next = producer(state);
    if (JSON.stringify(previous) === JSON.stringify(next)) {
      return;
    }

    const now = Date.now();
    const canMerge =
      options?.mergeKey !== undefined &&
      lastTransactionMeta?.mergeKey === options.mergeKey &&
      now - lastTransactionMeta.timestamp < 1000;

    if (!canMerge) {
      setUndoStack((stack) => [...stack, previous]);
    }

    setRedoStack([]);
    lastTransactionMeta = options?.mergeKey ? { mergeKey: options.mergeKey, timestamp: now } : null;
    applyState(next);
  };

  const clearPreferredColumn = () => {
    setPreferredColumnX(null);
  };

  const focusInput = () => {
    setFocused(true);
    queueMicrotask(() => {
      textareaRef?.focus();
      if (textareaRef) {
        textareaRef.selectionStart = textareaRef.value.length;
        textareaRef.selectionEnd = textareaRef.value.length;
      }
    });
  };

  const syncInputBox = () => {
    if (!surfaceRef) {
      setSelectionBoxes([]);
      setCaretBox((current) => ({ ...current, visible: false }));
      return;
    }

    const surfaceRect = surfaceRef.getBoundingClientRect();
    const paragraphs = getParagraphs(state);
    const normalized = normalizeSelection(state);
    const nextSelectionBoxes: SelectionBox[] = [];

    if (!normalized.isCollapsed) {
      for (let paragraphIndex = normalized.startIndex; paragraphIndex <= normalized.endIndex; paragraphIndex += 1) {
        const paragraph = paragraphs[paragraphIndex];
        if (!paragraph) {
          continue;
        }

        const paragraphElement = surfaceRef.querySelector<HTMLElement>(
          `[data-paragraph-id="${paragraph.id}"]`,
        );
        if (!paragraphElement) {
          continue;
        }

        const paragraphText = getParagraphText(paragraph);
        const charRects = collectCharRects(paragraphElement);
        const startOffset = paragraphIndex === normalized.startIndex ? normalized.startParagraphOffset : 0;
        const endOffset =
          paragraphIndex === normalized.endIndex ? normalized.endParagraphOffset : paragraphText.length;

        if (charRects.length === 0) {
          const paragraphRect = paragraphElement.getBoundingClientRect();
          nextSelectionBoxes.push({
            left: paragraphRect.left - surfaceRect.left,
            top: paragraphRect.top - surfaceRect.top,
            width: Math.max(12, paragraphRect.width || 12),
            height: paragraphRect.height || 28,
          });
          continue;
        }

        const layout = measureParagraphLayoutFromRects(paragraph, charRects);
        for (const line of layout.lines) {
          const lineStart = Math.max(startOffset, line.startOffset);
          const lineEnd = Math.min(endOffset, line.endOffset);
          if (lineStart >= lineEnd) {
            continue;
          }

          const startSlot = line.slots.find((slot) => slot.offset === lineStart);
          const endSlot = line.slots.find((slot) => slot.offset === lineEnd);
          if (!startSlot || !endSlot) {
            continue;
          }

          nextSelectionBoxes.push({
            left: startSlot.left - surfaceRect.left,
            top: line.top - surfaceRect.top,
            width: Math.max(1, endSlot.left - startSlot.left),
            height: line.height,
          });
        }
      }
    }

    setSelectionBoxes(nextSelectionBoxes);

    const selectedParagraph = surfaceRef.querySelector<HTMLElement>(
      `[data-paragraph-id="${state.selection.focus.paragraphId}"]`,
    );
    if (!selectedParagraph) {
      setCaretBox((current) => ({ ...current, visible: false }));
      return;
    }

    const charRects = collectCharRects(selectedParagraph);
    const selectedParagraphNode =
      paragraphs.find((paragraph) => paragraph.id === state.selection.focus.paragraphId) ?? paragraphs[0];
    let left = 0;
    let top = 0;
    let height = 28;

    if (charRects.length === 0) {
      const paragraphRect = selectedParagraph.getBoundingClientRect();
      left = paragraphRect.left - surfaceRect.left;
      top = paragraphRect.top - surfaceRect.top;
      height = paragraphRect.height || 28;
    } else {
      const layout = measureParagraphLayoutFromRects(selectedParagraphNode, charRects);
      const slots =
        layout.lines.length > 0
          ? layout.lines.flatMap((line, lineIndex) =>
              lineIndex === layout.lines.length - 1 ? line.slots : line.slots.slice(0, -1),
            )
          : getCaretSlotRects(charRects).map((slot, offset) => ({
              paragraphId: selectedParagraphNode.id,
              offset,
              left: slot.left,
              top: slot.top,
              height: slot.height,
            }));
      const focusOffset = positionToParagraphOffset(selectedParagraphNode, state.selection.focus);
      const slotIndex = Math.max(0, Math.min(focusOffset, slots.length - 1));
      const slot = slots[slotIndex];
      left = slot.left - surfaceRect.left;
      top = slot.top - surfaceRect.top;
      height = slot.height;
    }

    setInputBox({
      left,
      top,
      height,
    });
    setCaretBox({
      left,
      top,
      height,
      visible: true,
    });
  };

  const requestInputBoxSync = () => {
    const requestId = ++syncRequestId;
    queueMicrotask(() => {
      if (requestId !== syncRequestId) {
        return;
      }
      syncInputBox();
    });
  };

  createEffect(() => {
    state.selection.anchor.paragraphId;
    state.selection.anchor.runId;
    state.selection.anchor.offset;
    state.selection.focus.paragraphId;
    state.selection.focus.runId;
    state.selection.focus.offset;
    getParagraphs(state)
      .map((paragraph) => paragraph.runs.map((run) => run.text).join(""))
      .join("\n");
    requestInputBoxSync();
  });

  onCleanup(() => {
    syncRequestId += 1;
    stopDragging();
  });

  const handleTextInput = (event: InputEvent & { currentTarget: HTMLTextAreaElement }) => {
    const text = event.currentTarget.value;
    if (text.length === 0) {
      return;
    }

    if (composing()) {
      return;
    }

    if (suppressedInputText !== null && text === suppressedInputText) {
      suppressedInputText = null;
      event.currentTarget.value = "";
      return;
    }

    clearPreferredColumn();
    applyTransactionalState((current) => insertTextAtSelection(current, text), {
      mergeKey: "insertText",
    });
    event.currentTarget.value = "";
    focusInput();
  };

  const handleCompositionStart = () => {
    setComposing(true);
  };

  const handleCompositionEnd = (event: CompositionEvent & { currentTarget: HTMLTextAreaElement }) => {
    const text = event.data ?? event.currentTarget.value;
    setComposing(false);

    if (text.length === 0) {
      event.currentTarget.value = "";
      return;
    }

    suppressedInputText = text;
    clearPreferredColumn();
    applyTransactionalState((current) => insertTextAtSelection(current, text), {
      mergeKey: "insertText",
    });
    event.currentTarget.value = "";
    focusInput();
  };

  const handleCopy = (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    const text = getSelectedText(state);
    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    event.clipboardData?.setData("text/plain", text);
  };

  const handleCut = (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    const text = getSelectedText(state);
    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    event.clipboardData?.setData("text/plain", text);
    clearPreferredColumn();
    resetTransactionGrouping();
    applyTransactionalState((current) => deleteBackward(current));
    focusInput();
  };

  const handlePaste = (event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (text.length === 0) {
      return;
    }

    event.preventDefault();
    clearPreferredColumn();
    resetTransactionGrouping();
    applyTransactionalState((current) => insertPlainTextAtSelection(current, text));
    event.currentTarget.value = "";
    focusInput();
  };

  const moveVerticalByBlock = (direction: -1 | 1) => {
    return moveVerticalSelection(direction, false);
  };

  const moveVerticalSelection = (direction: -1 | 1, extend: boolean) => {
    const paragraphs = getParagraphs(state);
    const currentIndex = paragraphs.findIndex(
      (paragraph) => paragraph.id === state.selection.focus.paragraphId,
    );
    if (currentIndex === -1) {
      return false;
    }

    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= paragraphs.length) {
      return false;
    }

    const targetParagraph = paragraphs[targetIndex];
    const targetElement = surfaceRef?.querySelector<HTMLElement>(
      `[data-paragraph-id="${targetParagraph.id}"]`,
    );
    const desiredX = preferredColumnX() ?? caretBox().left;

    let offset = 0;
    if (targetElement) {
      const layout = measureParagraphLayoutFromRects(targetParagraph, collectCharRects(targetElement));
      const lines = layout.lines;
      const boundaryLine = direction < 0 ? lines[lines.length - 1] : lines[0];
      offset =
        boundaryLine?.slots.length
          ? boundaryLine.slots.reduce(
              (best, slot) =>
                Math.abs(desiredX + (surfaceRef?.getBoundingClientRect().left ?? 0) - slot.left) <
                Math.abs(desiredX + (surfaceRef?.getBoundingClientRect().left ?? 0) - best.left)
                  ? slot
                  : best,
              boundaryLine.slots[0]!,
            ).offset
          : 0;
    } else {
      offset = Math.min(positionToParagraphOffset(targetParagraph, state.selection.focus), getParagraphText(targetParagraph).length);
    }

    setPreferredColumnX(desiredX);
    resetTransactionGrouping();
    applyTransactionalState((current) =>
      setSelection(current, {
        anchor: extend
          ? current.selection.anchor
          : paragraphOffsetToPosition(targetParagraph, offset),
        focus: paragraphOffsetToPosition(targetParagraph, offset),
      }),
    );
    focusInput();
    return true;
  };

  const resolvePositionAtPoint = (clientX: number, clientY: number): Editor2Position | null => {
    const target = document.elementFromPoint(clientX, clientY);
    if (!(target instanceof HTMLElement)) {
      return null;
    }

    const paragraphElement = target.closest<HTMLElement>("[data-paragraph-id]");
    if (!paragraphElement) {
      return null;
    }

    const paragraphId = paragraphElement.dataset.paragraphId;
    if (!paragraphId) {
      return null;
    }

    const paragraph = getParagraphs(state).find((candidate) => candidate.id === paragraphId);
    if (!paragraph) {
      return null;
    }

    return paragraphOffsetToPosition(
      paragraph,
      resolveClosestOffsetInMeasuredLayout(
        measureParagraphLayoutFromRects(paragraph, collectCharRects(paragraphElement)),
        clientX,
        clientY,
      ),
    );
  };

  const stopDragging = () => {
    dragAnchor = null;
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
  };

  const handleWindowMouseMove = (event: MouseEvent) => {
    if (!dragAnchor) {
      return;
    }

    const position = resolvePositionAtPoint(event.clientX, event.clientY);
    if (!position) {
      return;
    }

    applyState(
      setSelection(state, {
        anchor: dragAnchor,
        focus: position,
      }),
    );
  };

  const handleWindowMouseUp = () => {
    stopDragging();
    focusInput();
  };

  const handleKeyDown = (event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a" && !event.altKey) {
      event.preventDefault();
      const paragraphs = getParagraphs(state);
      if (paragraphs.length === 0) {
        return;
      }

      const firstParagraph = paragraphs[0];
      const lastParagraph = paragraphs[paragraphs.length - 1];
      clearPreferredColumn();
      applyState(
        setSelection(state, {
          anchor: paragraphOffsetToPosition(firstParagraph, 0),
          focus: paragraphOffsetToPosition(lastParagraph, getParagraphText(lastParagraph).length),
        }),
      );
      focusInput();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      const lowerKey = event.key.toLowerCase();
      if (lowerKey === "b" || lowerKey === "i" || lowerKey === "u") {
        event.preventDefault();
        clearPreferredColumn();
        resetTransactionGrouping();
        applyTransactionalState((current) =>
          toggleTextStyle(
            current,
            lowerKey === "b" ? "bold" : lowerKey === "i" ? "italic" : "underline",
          ),
        );
        focusInput();
        return;
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.altKey) {
      event.preventDefault();
      if (event.shiftKey) {
        const nextRedoStack = redoStack();
        if (nextRedoStack.length === 0) {
          return;
        }
        const next = nextRedoStack[nextRedoStack.length - 1];
        setRedoStack((stack) => stack.slice(0, -1));
        setUndoStack((stack) => [...stack, cloneState(state)]);
        clearPreferredColumn();
        resetTransactionGrouping();
        applyHistoryState(next);
        focusInput();
        return;
      }

      const nextUndoStack = undoStack();
      if (nextUndoStack.length === 0) {
        return;
      }
      const next = nextUndoStack[nextUndoStack.length - 1];
      setUndoStack((stack) => stack.slice(0, -1));
      setRedoStack((stack) => [...stack, cloneState(state)]);
      clearPreferredColumn();
      resetTransactionGrouping();
      applyHistoryState(next);
      focusInput();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y" && !event.altKey) {
      event.preventDefault();
      const nextRedoStack = redoStack();
      if (nextRedoStack.length === 0) {
        return;
      }
      const next = nextRedoStack[nextRedoStack.length - 1];
      setRedoStack((stack) => stack.slice(0, -1));
      setUndoStack((stack) => [...stack, cloneState(state)]);
      clearPreferredColumn();
      resetTransactionGrouping();
      applyHistoryState(next);
      focusInput();
      return;
    }

    switch (event.key) {
      case "Enter":
        event.preventDefault();
        clearPreferredColumn();
        resetTransactionGrouping();
        applyTransactionalState((current) => splitBlockAtSelection(current));
        focusInput();
        return;
      case "Backspace":
        event.preventDefault();
        clearPreferredColumn();
        resetTransactionGrouping();
        applyTransactionalState((current) => deleteBackward(current));
        event.currentTarget.value = "";
        focusInput();
        return;
      case "Delete":
        event.preventDefault();
        clearPreferredColumn();
        resetTransactionGrouping();
        applyTransactionalState((current) => deleteForward(current));
        event.currentTarget.value = "";
        focusInput();
        return;
      case "ArrowLeft":
        event.preventDefault();
        resetTransactionGrouping();
        if (event.shiftKey) {
          clearPreferredColumn();
          applyState(extendSelectionLeft(state));
        } else {
          clearPreferredColumn();
          applyState(moveSelectionLeft(state));
        }
        focusInput();
        return;
      case "ArrowRight":
        event.preventDefault();
        resetTransactionGrouping();
        if (event.shiftKey) {
          clearPreferredColumn();
          applyState(extendSelectionRight(state));
        } else {
          clearPreferredColumn();
          applyState(moveSelectionRight(state));
        }
        focusInput();
        return;
      case "ArrowUp":
        event.preventDefault();
        resetTransactionGrouping();
        if (event.shiftKey) {
          if (!moveVerticalSelection(-1, true)) {
            applyState(extendSelectionUp(state));
            focusInput();
          }
        } else if (!moveVerticalByBlock(-1)) {
          applyState(moveSelectionUp(state));
          focusInput();
        }
        return;
      case "ArrowDown":
        event.preventDefault();
        resetTransactionGrouping();
        if (event.shiftKey) {
          if (!moveVerticalSelection(1, true)) {
            applyState(extendSelectionDown(state));
            focusInput();
          }
        } else if (!moveVerticalByBlock(1)) {
          applyState(moveSelectionDown(state));
          focusInput();
        }
        return;
      default:
        return;
    }
  };

  return (
    <div class="oasis-editor-2-app">
      <header class="oasis-editor-2-header">
        <p class="oasis-editor-2-eyebrow">oasis-editor-2</p>
        <h1 class="oasis-editor-2-title">Minimal editor</h1>
        <p class="oasis-editor-2-copy">
          Block model, collapsed caret, Solid render tree, and a transparent textarea as the only
          keyboard transport.
        </p>
      </header>

      <section class="oasis-editor-2-stage">
        <div
          ref={surfaceRef}
          class="oasis-editor-2-editor"
          data-testid="editor-2-editor"
          onMouseDown={(event) => {
            event.preventDefault();
            focusInput();
          }}
        >
          <EditorSurface
            state={() => state}
            onSurfaceMouseDown={(event) => {
              event.preventDefault();
              focusInput();
            }}
            onParagraphMouseDown={(paragraphId, event) => {
              event.preventDefault();
              const paragraph = getParagraphs(state).find((candidate) => candidate.id === paragraphId);
              if (!paragraph) {
                return;
              }
              clearPreferredColumn();
              resetTransactionGrouping();
              const offset = resolveClickOffset(
                event,
                measureParagraphLayoutFromRects(paragraph, collectCharRects(event.currentTarget)),
              );
              const position = paragraphOffsetToPosition(paragraph, offset);

              if (event.shiftKey) {
                dragAnchor = state.selection.anchor;
                applyState(
                  setSelection(state, {
                    anchor: state.selection.anchor,
                    focus: position,
                  }),
                );
                window.addEventListener("mousemove", handleWindowMouseMove);
                window.addEventListener("mouseup", handleWindowMouseUp);
                focusInput();
                return;
              }

              if (event.detail >= 3) {
                dragAnchor = null;
                applyState(
                  setSelection(state, {
                    anchor: paragraphOffsetToPosition(paragraph, 0),
                    focus: paragraphOffsetToPosition(paragraph, getParagraphText(paragraph).length),
                  }),
                );
                stopDragging();
                focusInput();
                return;
              }

              if (event.detail === 2) {
                const word = resolveWordSelection(getParagraphText(paragraph), offset);
                dragAnchor = null;
                applyState(
                  setSelection(state, {
                    anchor: paragraphOffsetToPosition(paragraph, word.start),
                    focus: paragraphOffsetToPosition(paragraph, word.end),
                  }),
                );
                stopDragging();
                focusInput();
                return;
              }

              dragAnchor = position;
              applyState(
                setSelection(state, {
                  anchor: position,
                  focus: position,
                }),
              );
              window.addEventListener("mousemove", handleWindowMouseMove);
              window.addEventListener("mouseup", handleWindowMouseUp);
              focusInput();
            }}
          />

          {!isSelectionCollapsed(state.selection) ? <SelectionOverlay boxes={selectionBoxes()} /> : null}

          {caretBox().visible && isSelectionCollapsed(state.selection) ? (
            <CaretOverlay
              active={focused()}
              left={caretBox().left}
              top={caretBox().top}
              height={caretBox().height}
            />
          ) : null}

          <textarea
            ref={textareaRef}
            aria-label="Editor input"
            autocomplete="off"
            autocapitalize="off"
            class="oasis-editor-2-input"
            data-testid="editor-2-input"
            spellcheck={false}
            value=""
            style={{
              left: `${inputBox().left}px`,
              top: `${inputBox().top}px`,
              height: `${inputBox().height}px`,
            }}
            onBlur={() => setFocused(false)}
            onCompositionEnd={handleCompositionEnd}
            onCompositionStart={handleCompositionStart}
            onCopy={handleCopy}
            onCut={handleCut}
            onFocus={() => setFocused(true)}
            onInput={handleTextInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />
        </div>
      </section>
    </div>
  );
}
