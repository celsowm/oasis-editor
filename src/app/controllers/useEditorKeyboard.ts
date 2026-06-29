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
import {
  getParagraphs,
  getParagraphText,
  paragraphOffsetToPosition,
  positionToParagraphOffset, EditorState } from "@/core/model.js";
import { isSelectionCollapsed } from "@/core/selection.js";
import { resolveWordSelection } from "@/core/wordBoundaries.js";
import {
  defaultEditorKeyBindings,
  EditorCommandRegistry,
} from "./EditorCommandRegistry.js";
import type { EditorKeyboardDeps } from "./EditorKeyboardDeps.js";

export type { EditorKeyboardDeps } from "./EditorKeyboardDeps.js";

export function createEditorKeyboardController(deps: EditorKeyboardDeps) {
  const registry = new EditorCommandRegistry();
  defaultEditorKeyBindings.forEach((binding): void => registry.register(binding));

  const handleKeyDown = (
    event: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
  ): void => {
    const currentState = deps.state();

    if (deps.isReadOnly()) {
      const key = event.key;
      const lowerKey = key.toLowerCase();
      const isNavigationKey =
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

    const commandExecutor = deps.executeCommand
      ? {
          executeCommand: (commandName: string, payload?: unknown): unknown =>
            deps.executeCommand?.(commandName, payload),
          canExecuteCommand: (commandName: string, payload?: unknown): boolean | undefined =>
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

        const focusOffset = currentState.selection.focus.offset;
        const paragraphText = getParagraphText(focusParagraph);
        const word = resolveWordSelection(paragraphText, focusOffset);

        if (event.key === "Backspace") {
          if (focusOffset === 0 || word.start === focusOffset) {
            deps.applyTransactionalState((current): EditorState =>
              deps.applyTableAwareParagraphEdit(current, (temp): EditorState =>
                deleteBackward(temp),
              ),
            );
          } else {
            deps.applyTransactionalState((current): EditorState =>
              deps.applyTableAwareParagraphEdit(
                setSelection(current, {
                  anchor: paragraphOffsetToPosition(focusParagraph, word.start),
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
        } else if (word.end > focusOffset) {
          deps.applyTransactionalState((current): EditorState =>
            deps.applyTableAwareParagraphEdit(
              setSelection(current, {
                anchor: paragraphOffsetToPosition(focusParagraph, focusOffset),
                focus: paragraphOffsetToPosition(focusParagraph, word.end),
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
      case "Tab": {
        if (
          deps.commandsController.handleListTab(
            event.shiftKey ? "outdent" : "indent",
          )
        ) {
          event.preventDefault();
          return;
        }
        const nextPosition = deps.resolveAdjacentTableCellPosition(
          currentState.document,
          currentState.selection.focus.paragraphId,
          event.shiftKey ? -1 : 1,
        );
        if (nextPosition) {
          event.preventDefault();
          deps.clearPreferredColumn();
          deps.resetTransactionGrouping();
          deps.applySelectionPreservingStructure({
            anchor: nextPosition,
            focus: nextPosition,
          });
          deps.focusInput();
          return;
        }
        break;
      }
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
