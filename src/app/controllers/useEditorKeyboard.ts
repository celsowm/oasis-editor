import { outdentParagraphList } from "@/core/commands/list.js";
import {
  extendSelectionDown,
  extendSelectionLeft,
  extendSelectionRight,
  extendSelectionUp,
  moveSelectionDown,
  moveSelectionLeft,
  moveSelectionRight,
  moveSelectionUp,
  setSelection,
} from "@/core/commands/selection.js";
import { deleteBackward, deleteForward } from "@/core/commands/text.js";
import { handleDocumentTab } from "./handleDocumentTab.js";
import { outdentParagraphAtBoundary, resolveParagraphBoundaryOutdent } from "@/core/commands/paragraphTabIndent.js";
import {
  getParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  positionToParagraphOffset,
  EditorState,
} from "@/core/model.js";
import { isSelectionCollapsed } from "@/core/selection.js";
import { findPreviousWordBoundary, findNextWordBoundary } from "@/core/wordBoundaries.js";
import {
  defaultEditorKeyBindings,
  EditorCommandRegistry,
} from "./EditorCommandRegistry.js";
import type { EditorKeyboardDeps } from "./EditorKeyboardDeps.js";

export type { EditorKeyboardDeps } from "./EditorKeyboardDeps.js";

export function createEditorKeyboardController(
  deps: EditorKeyboardDeps,
): ReturnType<typeof createEditorKeyboardControllerImpl> {
  return createEditorKeyboardControllerImpl(deps);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createEditorKeyboardControllerImpl(deps: EditorKeyboardDeps) {
  const registry = new EditorCommandRegistry();
  defaultEditorKeyBindings.forEach((binding): void =>
    registry.register(binding),
  );

  const handleKeyDown = (
    event: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
  ): void => {
    if (event.defaultPrevented) return;
    const currentState = deps.state();

    if (deps.isReadOnly()) {
      const key = event.key;
      const lowerKey = key.toLowerCase();
      const isNavigationKey =
        key === "Tab" ||
        key === "ArrowLeft" ||
        key === "ArrowRight" ||
        key === "ArrowUp" ||
        key === "ArrowDown" ||
        key === "Home" ||
        key === "End" ||
        key === "PageUp" ||
        key === "PageDown";
      const isModifierOnly =
        key === "Shift" || key === "Control" || key === "Meta" || key === "Alt";
      const isCopyOrSelectAll =
        (event.ctrlKey || event.metaKey) &&
        (lowerKey === "a" || lowerKey === "c");
      if (!isNavigationKey && !isModifierOnly && !isCopyOrSelectAll) {
        event.preventDefault();
      }
      return;
    }

    // While an IME composition is active the keyboard belongs to the IME:
    // mobile keyboards emit real Enter/Backspace keydowns mid-composition, and
    // acting on them here would duplicate or corrupt the composition preview.
    // Chrome reports keyCode 229 for the same situation on Android.
    if (event.isComposing || event.keyCode === 229) {
      return;
    }

    const commandExecutor = deps.executeCommand
      ? {
          executeCommand: (commandName: string, payload?: unknown): unknown =>
            deps.executeCommand?.(commandName, payload),
          canExecuteCommand: (
            commandName: string,
            payload?: unknown,
          ): boolean | undefined =>
            deps.canExecuteCommand?.(commandName, payload),
        }
      : undefined;

    if (registry.execute(event, deps, commandExecutor)) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        deps.resetTransactionGrouping();
        if (
          deps.moveSelectionByWord(
            event.key === "ArrowLeft" ? "left" : "right",
            event.shiftKey,
          )
        ) {
          deps.focusInput();
          return;
        }
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        deps.clearPreferredColumn();
        deps.resetTransactionGrouping();

        if (!isSelectionCollapsed(currentState.selection)) {
          deps.applyTransactionalState((current): EditorState =>
            deps.applyTableAwareParagraphEdit(current, (temp): EditorState =>
              deleteBackward(temp),
            ),
          );
          event.currentTarget.value = "";
          deps.focusInput();
          return;
        }

        const paragraphs = getParagraphs(currentState);
        const focusParagraphIndex = paragraphs.findIndex(
          (paragraph): boolean =>
            paragraph.id === currentState.selection.focus.paragraphId,
        );
        const focusParagraph = paragraphs[focusParagraphIndex];
        if (!focusParagraph) {
          event.currentTarget.value = "";
          deps.focusInput();
          return;
        }

        if (event.key === "Backspace" && focusParagraph.list) {
          const focusParagraphOffset = positionToParagraphOffset(
            focusParagraph,
            currentState.selection.focus,
          );
          if (focusParagraphOffset === 0) {
            deps.applySelectionAwareParagraphCommand((current): EditorState =>
              outdentParagraphList(current),
            );
            event.currentTarget.value = "";
            deps.focusInput();
            return;
          }
        }

        const focusOffset = positionToParagraphOffset(focusParagraph, currentState.selection.focus);
        const paragraphText = getParagraphText(focusParagraph);
        const boundary = event.key === "Backspace"
          ? findPreviousWordBoundary(paragraphText, focusOffset)
          : findNextWordBoundary(paragraphText, focusOffset);

        if (event.key === "Backspace") {
          if (focusOffset === 0 || boundary === focusOffset) {
            deps.applyTransactionalState((current): EditorState =>
              deps.applyTableAwareParagraphEdit(current, (temp): EditorState =>
                deleteBackward(temp),
              ),
            );
          } else {
            deps.applyTransactionalState((current): EditorState =>
              deps.applyTableAwareParagraphEdit(
                setSelection(current, {
                  anchor: paragraphOffsetToPosition(focusParagraph, boundary),
                  focus: paragraphOffsetToPosition(focusParagraph, focusOffset),
                }),
                (temp): EditorState => deleteBackward(temp),
              ),
            );
          }
        } else if (focusOffset >= paragraphText.length) {
          deps.applyTransactionalState((current): EditorState =>
            deps.applyTableAwareParagraphEdit(current, (temp): EditorState =>
              deleteForward(temp),
            ),
          );
        } else if (boundary > focusOffset) {
          deps.applyTransactionalState((current): EditorState =>
            deps.applyTableAwareParagraphEdit(
              setSelection(current, {
                anchor: paragraphOffsetToPosition(focusParagraph, focusOffset),
                focus: paragraphOffsetToPosition(focusParagraph, boundary),
              }),
              (temp): EditorState => deleteBackward(temp),
            ),
          );
        } else {
          deps.applyTransactionalState((current): EditorState =>
            deps.applyTableAwareParagraphEdit(current, (temp): EditorState =>
              deleteForward(temp),
            ),
          );
        }

        event.currentTarget.value = "";
        deps.focusInput();
        return;
      }
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      deps.resetTransactionGrouping();
      const boundary = event.key === "Home" ? "start" : "end";
      if (event.ctrlKey || event.metaKey) {
        deps.moveSelectionToDocumentBoundary(boundary, event.shiftKey);
      } else {
        deps.moveSelectionToParagraphBoundary(boundary, event.shiftKey);
      }
      deps.focusInput();
      return;
    }

    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        deps.resetTransactionGrouping();
        deps.clearPreferredColumn();
        if (
          deps.moveSelectedImageByParagraph(event.key === "ArrowUp" ? -1 : 1)
        ) {
          return;
        }
      }
    }

    switch (event.key) {
      case "Backspace":
        if (deps.commandsController.handleListBoundaryBackspace(event)) {
          event.preventDefault();
          return;
        }
        // Formatting at paragraph offset zero is not a literal tab character.
        // Consume Backspace here before deleteBackward can merge paragraphs.
        if (!event.altKey && !event.ctrlKey && !event.metaKey &&
            resolveParagraphBoundaryOutdent(currentState)) {
          event.preventDefault();
          deps.clearPreferredColumn();
          deps.resetTransactionGrouping();
          if (deps.canExecuteCommand?.("outdent") !== false) {
            deps.applySelectionAwareParagraphCommand(outdentParagraphAtBoundary);
          }
          event.currentTarget.value = "";
          deps.focusInput();
          return;
        }
        event.preventDefault();
        deps.clearPreferredColumn();
        deps.resetTransactionGrouping();
        deps.applyTransactionalState((current): EditorState =>
          deps.applyTableAwareParagraphEdit(current, (temp): EditorState =>
            deleteBackward(temp),
          ),
        );
        event.currentTarget.value = "";
        deps.focusInput();
        return;
      case "Delete":
        event.preventDefault();
        deps.clearPreferredColumn();
        deps.resetTransactionGrouping();
        deps.applyTransactionalState((current): EditorState =>
          deps.applyTableAwareParagraphEdit(current, (temp): EditorState =>
            deleteForward(temp),
          ),
        );
        event.currentTarget.value = "";
        deps.focusInput();
        return;
      case "Tab":
        handleDocumentTab(deps, currentState, event);
        return;
      case "ArrowLeft":
        event.preventDefault();
        deps.resetTransactionGrouping();
        if (event.shiftKey) {
          deps.clearPreferredColumn();
          deps.applyState(extendSelectionLeft(currentState));
        } else {
          deps.clearPreferredColumn();
          deps.applyState(moveSelectionLeft(currentState));
        }
        deps.focusInput();
        return;
      case "ArrowRight":
        event.preventDefault();
        deps.resetTransactionGrouping();
        if (event.shiftKey) {
          deps.clearPreferredColumn();
          deps.applyState(extendSelectionRight(currentState));
        } else {
          deps.clearPreferredColumn();
          deps.applyState(moveSelectionRight(currentState));
        }
        deps.focusInput();
        return;
      case "ArrowUp":
        event.preventDefault();
        deps.resetTransactionGrouping();
        if (event.shiftKey) {
          if (!deps.moveVerticalSelection(-1, true)) {
            deps.applyState(extendSelectionUp(currentState));
            deps.focusInput();
          }
        } else if (!deps.moveVerticalByBlock(-1)) {
          deps.applyState(moveSelectionUp(currentState));
          deps.focusInput();
        }
        return;
      case "ArrowDown":
        event.preventDefault();
        deps.resetTransactionGrouping();
        if (event.shiftKey) {
          if (!deps.moveVerticalSelection(1, true)) {
            deps.applyState(extendSelectionDown(currentState));
            deps.focusInput();
          }
        } else if (!deps.moveVerticalByBlock(1)) {
          deps.applyState(moveSelectionDown(currentState));
          deps.focusInput();
        }
        return;
      default:
        return;
    }
  };

  return {
    handleKeyDown,
    registry, // Expose for configurability later
  };
}
