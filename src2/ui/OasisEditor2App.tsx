import { createEffect, createSignal, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { EditorSurface } from "./components/EditorSurface.js";
import { CaretOverlay } from "./components/CaretOverlay.js";
import {
  getCaretSlotRects,
  resolveClosestOffsetForBoundaryLine,
  resolveClosestOffsetFromRects,
} from "./caretGeometry.js";
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
} from "../core/editorCommands.js";
import { createInitialEditor2State } from "../core/editorState.js";
import type { Editor2Position, Editor2State } from "../core/model.js";
import { isSelectionCollapsed } from "../core/selection.js";

interface InputBox {
  left: number;
  top: number;
  height: number;
}

interface CaretBox extends InputBox {
  visible: boolean;
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
  blockTextLength: number,
): number {
  if (blockTextLength === 0) {
    return 0;
  }

  const charRects = collectCharRects(event.currentTarget);
  if (charRects.length === 0) {
    return blockTextLength;
  }

  return Math.max(
    0,
    Math.min(blockTextLength, resolveClosestOffsetFromRects(charRects, event.clientX, event.clientY)),
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
  const [inputBox, setInputBox] = createSignal<InputBox>({ left: 0, top: 0, height: 28 });
  const [preferredColumnX, setPreferredColumnX] = createSignal<number | null>(null);
  const [undoStack, setUndoStack] = createSignal<Editor2State[]>([]);
  const [redoStack, setRedoStack] = createSignal<Editor2State[]>([]);
  const [caretBox, setCaretBox] = createSignal<CaretBox>({
    left: 0,
    top: 0,
    height: 28,
    visible: false,
  });
  let surfaceRef: HTMLDivElement | undefined;
  let textareaRef: HTMLTextAreaElement | undefined;
  let rafId: number | undefined;
  let dragAnchor: Editor2Position | null = null;

  const cloneState = (source: Editor2State): Editor2State => ({
    blocks: source.blocks.map((block) => ({ ...block })),
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

  const applyTransactionalState = (producer: (current: Editor2State) => Editor2State) => {
    const previous = cloneState(state);
    const next = producer(state);
    if (JSON.stringify(previous) === JSON.stringify(next)) {
      return;
    }

    setUndoStack((stack) => [...stack, previous]);
    setRedoStack([]);
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
      setCaretBox((current) => ({ ...current, visible: false }));
      return;
    }

    const selectedBlock = surfaceRef.querySelector<HTMLElement>(
      `[data-block-id="${state.selection.focus.blockId}"]`,
    );
    if (!selectedBlock) {
      setCaretBox((current) => ({ ...current, visible: false }));
      return;
    }

    const surfaceRect = surfaceRef.getBoundingClientRect();
    const charRects = collectCharRects(selectedBlock);
    let left = 0;
    let top = 0;
    let height = 28;

    if (charRects.length === 0) {
      const blockRect = selectedBlock.getBoundingClientRect();
      left = blockRect.left - surfaceRect.left;
      top = blockRect.top - surfaceRect.top;
      height = blockRect.height || 28;
    } else {
      const slots = getCaretSlotRects(charRects);
      const slotIndex = Math.max(0, Math.min(state.selection.focus.offset, slots.length - 1));
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
    if (rafId !== undefined) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => {
      syncInputBox();
      rafId = undefined;
    });
  };

  createEffect(() => {
    state.selection.anchor.blockId;
    state.selection.anchor.offset;
    state.selection.focus.blockId;
    state.selection.focus.offset;
    state.blocks.map((block) => block.text).join("\n");
    requestInputBoxSync();
  });

  onCleanup(() => {
    if (rafId !== undefined) {
      cancelAnimationFrame(rafId);
    }
    stopDragging();
  });

  const handleTextInput = (event: InputEvent & { currentTarget: HTMLTextAreaElement }) => {
    const text = event.currentTarget.value;
    if (text.length === 0) {
      return;
    }

    clearPreferredColumn();
    applyTransactionalState((current) => insertTextAtSelection(current, text));
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
    applyTransactionalState((current) => insertPlainTextAtSelection(current, text));
    event.currentTarget.value = "";
    focusInput();
  };

  const moveVerticalByBlock = (direction: -1 | 1) => {
    return moveVerticalSelection(direction, false);
  };

  const moveVerticalSelection = (direction: -1 | 1, extend: boolean) => {
    const currentIndex = state.blocks.findIndex((block) => block.id === state.selection.focus.blockId);
    if (currentIndex === -1) {
      return false;
    }

    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= state.blocks.length) {
      return false;
    }

    const targetBlock = state.blocks[targetIndex];
    const targetElement = surfaceRef?.querySelector<HTMLElement>(`[data-block-id="${targetBlock.id}"]`);
    const desiredX = preferredColumnX() ?? caretBox().left;

    let offset = 0;
    if (targetElement) {
      const charRects = collectCharRects(targetElement);
      offset =
        charRects.length === 0
          ? 0
          : resolveClosestOffsetForBoundaryLine(
              charRects,
              desiredX + (surfaceRef?.getBoundingClientRect().left ?? 0),
              direction < 0 ? "last" : "first",
            );
    } else {
      offset = Math.min(state.selection.focus.offset, targetBlock.text.length);
    }

    setPreferredColumnX(desiredX);
    applyTransactionalState((current) =>
      setSelection(current, {
        anchor: extend
          ? current.selection.anchor
          : {
              blockId: targetBlock.id,
              offset,
            },
        focus: {
          blockId: targetBlock.id,
          offset,
        },
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

    const blockElement = target.closest<HTMLElement>("[data-block-id]");
    if (!blockElement) {
      return null;
    }

    const blockId = blockElement.dataset.blockId;
    if (!blockId) {
      return null;
    }

    const block = state.blocks.find((candidate) => candidate.id === blockId);
    if (!block) {
      return null;
    }

    return {
      blockId,
      offset: resolveClosestOffsetFromRects(collectCharRects(blockElement), clientX, clientY),
    };
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
      if (state.blocks.length === 0) {
        return;
      }

      const firstBlock = state.blocks[0];
      const lastBlock = state.blocks[state.blocks.length - 1];
      clearPreferredColumn();
      applyState(
        setSelection(state, {
          anchor: {
            blockId: firstBlock.id,
            offset: 0,
          },
          focus: {
            blockId: lastBlock.id,
            offset: lastBlock.text.length,
          },
        }),
      );
      focusInput();
      return;
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
      applyHistoryState(next);
      focusInput();
      return;
    }

    switch (event.key) {
      case "Enter":
        event.preventDefault();
        clearPreferredColumn();
        applyTransactionalState((current) => splitBlockAtSelection(current));
        focusInput();
        return;
      case "Backspace":
        event.preventDefault();
        clearPreferredColumn();
        applyTransactionalState((current) => deleteBackward(current));
        event.currentTarget.value = "";
        focusInput();
        return;
      case "Delete":
        event.preventDefault();
        clearPreferredColumn();
        applyTransactionalState((current) => deleteForward(current));
        event.currentTarget.value = "";
        focusInput();
        return;
      case "ArrowLeft":
        event.preventDefault();
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
            onBlockMouseDown={(blockId, event) => {
              event.preventDefault();
              const block = state.blocks.find((candidate) => candidate.id === blockId);
              if (!block) {
                return;
              }
              clearPreferredColumn();
              const offset = resolveClickOffset(event, block.text.length);
              const position = {
                blockId,
                offset,
              };

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
                    anchor: {
                      blockId,
                      offset: 0,
                    },
                    focus: {
                      blockId,
                      offset: block.text.length,
                    },
                  }),
                );
                stopDragging();
                focusInput();
                return;
              }

              if (event.detail === 2) {
                const word = resolveWordSelection(block.text, offset);
                dragAnchor = null;
                applyState(
                  setSelection(state, {
                    anchor: {
                      blockId,
                      offset: word.start,
                    },
                    focus: {
                      blockId,
                      offset: word.end,
                    },
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
